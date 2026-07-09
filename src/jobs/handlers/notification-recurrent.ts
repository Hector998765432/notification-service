import { getLogger } from '@/logging/logger.js';
import { companyMembersRepository } from '@/persistence/repositories/company-members.repository.js';
import type { CronJobHandler } from '@/types/jobs/index.js';
import { odooFleetRepository } from '@/db/odoo/fleet/fleet.js';
import { ContractType } from '@/types/supabase/contracts.types.js';
import { NotificationTemplateRepository } from '@/persistence/repositories/notification-template.repository.js';
import { getWhatsAppBulkSendService, getNotificationService } from '@/bootstrap/create-services.js';
import type { WhatsAppBulkMessageItem } from '@/whatsapp/types.js';
import { resolveGlobalBulkTemplate, resolveWhatsAppTemplate } from '../utils/resolveTemplate.js';
import { buildContractTemplateVars, buildGlobalBulkTemplateVars } from '../utils/resolveTemplateVars.js';
import {
  contractsForVins,
  filterNotifiableContracts,
  shouldUseBulkNotification,
  uniqueVinsFromContracts,
} from '../utils/formatBulkNotification.js';
import { sendNotificationSummarySafe } from '@/notifications/notification-summary.service.js';
import { sendBusinessNotificationSummarySafe } from '@/notifications/business-notification-summary.service.js';
import { getEnv } from '@/config/env.js';

const log = getLogger('jobs.handlers.notification-recurrent');

const env = getEnv();
const contactNumber = env.CONTACT_NUMBER;
const emailContactNumber = env.EMAIL_CONTACT_NUMBER;

export const notificationRecurrentHandler: CronJobHandler = async ({
  job,
  config,
  runId,
  workerId,
  triggeredBy,
  signal,
}) => {
  if (signal.aborted) {
    log.warn({ jobKey: job.key, runId, msg: 'Notification recurrent handler aborted before start' });
    return;
  }

  const notificationTemplateRepository = new NotificationTemplateRepository();
  const notificationTemplates = await notificationTemplateRepository.findAll();

  const expiringContracts = await odooFleetRepository.getExpiringContracts();
  if (!expiringContracts.length) {
    log.warn({ msg: 'No expiring contracts found' });
    return;
  }

  if (!notificationTemplates.length) {
    log.warn({ msg: 'No notification templates found' });
    return;
  }

  const expiringVins = [
    ...new Set(
      expiringContracts
        .map((contract) => contract.x_studio_numero_de_chasis_de_la_unidad)
        .filter((vin): vin is string => typeof vin === 'string' && vin.length > 0),
    ),
  ];

  const recipients = await companyMembersRepository.findNotificationRecipients(expiringVins);

  log.info({
    jobKey: job.key,
    taskKey: job.task_key,
    runId,
    workerId,
    triggeredBy,
    schedule: job.schedule,
    config,
    recipientsCount: recipients.length,
    expiringContractsCount: expiringContracts.length,
    msg: 'Notification recurrent handler started',
  });

  const whatsAppMessages: WhatsAppBulkMessageItem[] = [];
  let skippedWithoutPhone = 0;
  let skippedWithoutContract = 0;
  let skippedExcludedContractTypes = 0;
  let skippedWithoutTemplate = 0;
  let skippedWithoutExpirationDate = 0;

  for (const recipient of recipients) {
    if (!recipient.phone) {
      skippedWithoutPhone += 1;
      log.warn({ recipient, msg: 'Skipping recipient without phone' });
      continue;
    }

    const matchedContracts = contractsForVins(expiringContracts, recipient.vins);
    if (!matchedContracts.length) {
      skippedWithoutContract += 1;
      log.warn({ recipient, msg: 'Skipping recipient without matching expiring contracts' });
      continue;
    }

    const contracts = filterNotifiableContracts(matchedContracts);
    if (!contracts.length) {
      skippedExcludedContractTypes += 1;
      log.info({ recipient, msg: 'Skipping recipient: only excluded contract types (insurance/gps)' });
      continue;
    }

    const uniqueVins = uniqueVinsFromContracts(contracts);

    if (shouldUseBulkNotification(contracts, uniqueVins)) {
      const template = resolveGlobalBulkTemplate(notificationTemplates);
      if (!template) {
        skippedWithoutTemplate += 1;
        log.warn({ recipient, msg: 'Skipping recipient without global_bulk WhatsApp template' });
        continue;
      }

      whatsAppMessages.push({
        to: recipient.phone,
        template: template.name,
        templateVars: buildGlobalBulkTemplateVars({
          recipient,
          contracts,
          contactNumber,
        }),
      });

      log.info({
        recipient,
        contractCount: contracts.length,
        vinCount: uniqueVins.length,
        template: template.name,
        msg: 'Queued global_bulk WhatsApp notification for recipient',
      });
      continue;
    }

    const contract = contracts[0]!;
    const type = (contract.cost_subtype_id as [number, string])[1] as ContractType;
    const expirationDate = contract.expiration_date;
    const carName = (contract.vehicle_id as [number, string])[1] as string;
    const vin = uniqueVins[0] ?? recipient.vins[0] ?? '';

    if (!expirationDate) {
      skippedWithoutExpirationDate += 1;
      log.warn({ recipient, msg: 'Skipping recipient without expiration date' });
      continue;
    }

    const daysLeft = contract.days_left;
    const scheduleType = 'recurring';
    const template = resolveWhatsAppTemplate(
      notificationTemplates,
      type,
      daysLeft,
      type,
      scheduleType,
    );

    if (!template) {
      skippedWithoutTemplate += 1;
      log.warn({ recipient, type, daysLeft, msg: 'Skipping recipient without WhatsApp notification template' });
      continue;
    }

    const templateVars = buildContractTemplateVars({
      recipient,
      vin,
      carName,
      expirationDate,
      type,
      templateName: template.name,
      contactNumber,
      emailContactNumber,
    });

    if (!templateVars) {
      skippedWithoutTemplate += 1;
      log.warn({ recipient, type, template: template.name, msg: 'Skipping recipient without template variables' });
      continue;
    }

    whatsAppMessages.push({
      to: recipient.phone,
      template: template.name,
      templateVars,
    });

    log.info({
      recipient,
      carName,
      expirationDate,
      type,
      template: template.name,
      msg: 'Queued WhatsApp notification for recipient',
    });
  }

  log.info({ whatsAppMessages: whatsAppMessages, msg: 'WhatsApp messages to send' });
  const bulkResult = await getWhatsAppBulkSendService().sendBulk(whatsAppMessages, { signal });
  /* const bulkResult = {
    total: whatsAppMessages.length,
    succeeded: whatsAppMessages.length,
    failed: 0,
  }; */

  let summaryEmailSent = false;
  if (expiringContracts.length > 1) {
    summaryEmailSent = await sendNotificationSummarySafe(getNotificationService(), {
      expiringContracts,
      recipients,
      whatsAppMessages,
      bulkResult,
      runId,
      jobKey: job.key,
      environment: env.NODE_ENV,
      skipped: {
        phone: skippedWithoutPhone,
        contract: skippedWithoutContract,
        template: skippedWithoutTemplate,
        expirationDate: skippedWithoutExpirationDate,
        excludedContractTypes: skippedExcludedContractTypes,
      },
    });
  }

  let businessSummaryEmailSent = false;
  if (expiringContracts.length >= 1) {
    businessSummaryEmailSent = await sendBusinessNotificationSummarySafe(getNotificationService(), {
      expiringContracts,
      recipients,
      runId,
      jobKey: job.key,
      environment: env.NODE_ENV,
    });
  }

  log.info({
    jobKey: job.key,
    runId,
    whatsappTotal: bulkResult.total,
    whatsappSucceeded: bulkResult.succeeded,
    whatsappFailed: bulkResult.failed,
    summaryEmailSent,
    businessSummaryEmailSent,
    msg: 'Notification recurrent handler finished',
  });

  return {
    metadata: {
      job_key: job.key,
      run_id: runId,
      recipients_count: recipients.length,
      whatsapp_total: bulkResult.total,
      whatsapp_succeeded: bulkResult.succeeded,
      whatsapp_failed: bulkResult.failed,
      skipped_without_phone: skippedWithoutPhone,
      skipped_without_contract: skippedWithoutContract,
      skipped_excluded_contract_types: skippedExcludedContractTypes,
      skipped_without_template: skippedWithoutTemplate,
      skipped_without_expiration_date: skippedWithoutExpirationDate,
      summary_email_sent: summaryEmailSent,
      business_summary_email_sent: businessSummaryEmailSent,
    },
  };
};
