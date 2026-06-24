import { getEnv } from '@/config/env.js';
import { createEmailProvider } from '@/email/create-email-provider.js';
import type { EmailProvider } from '@/email/email-provider.js';
import { createWhatsAppProvider } from '@/whatsapp/create-whatsapp-provider.js';
import type { WhatsAppProvider } from '@/whatsapp/whatsapp-provider.js';
import { WhatsAppContextRepository } from '@/persistence/repositories/whatsapp-context.repository.js';
import {
  createNotificationService,
  type NotificationService,
} from '@/notifications/notification.service.js';
import {
  createCronJobRuntime,
  createDynamicCronScheduler,
  type DynamicCronScheduler,
} from '@/jobs/index.js';
import {
  createCronJobService,
  type CronJobService,
} from '@/jobs/cron-job.service.js';

let emailProvider: EmailProvider | null = null;
let whatsAppProvider: WhatsAppProvider | null = null;
let whatsAppContextRepository: WhatsAppContextRepository | null = null;
let notificationService: NotificationService | null = null;
let dynamicCronScheduler: DynamicCronScheduler | null = null;
let cronJobService: CronJobService | null = null;

export function getEmailProvider(): EmailProvider {
  if (!emailProvider) {
    emailProvider = createEmailProvider(getEnv());
  }
  return emailProvider;
}

export function getWhatsAppProvider(): WhatsAppProvider {
  if (!whatsAppProvider) {
    whatsAppProvider = createWhatsAppProvider(getEnv());
  }
  return whatsAppProvider;
}

export function getWhatsAppContextRepository(): WhatsAppContextRepository {
  if (!whatsAppContextRepository) {
    whatsAppContextRepository = new WhatsAppContextRepository();
  }
  return whatsAppContextRepository;
}

export function getNotificationService(): NotificationService {
  if (!notificationService) {
    notificationService = createNotificationService(
      getEmailProvider(),
      getWhatsAppProvider(),
      getEnv(),
      getWhatsAppContextRepository(),
    );
  }
  return notificationService;
}

export function getDynamicCronScheduler(): DynamicCronScheduler {
  if (!dynamicCronScheduler) {
    dynamicCronScheduler = createDynamicCronScheduler();
  }

  return dynamicCronScheduler;
}

export function getCronJobService(): CronJobService {
  if (!cronJobService) {
    const runtime = createCronJobRuntime();
    cronJobService = createCronJobService({
      repository: runtime.repository,
      registry: runtime.registry,
      runner: runtime.runner,
      scheduler: runtime.scheduler,
    });
  }

  return cronJobService;
}
