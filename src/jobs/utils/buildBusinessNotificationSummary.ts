import type { OdooFleetVehicleLogContractExpiring } from '@/types/odoo/fleets/log.contract/log.contract.js';
import type { NotificationRecipient } from '@/types/supabase/tables.js';
import {
  buildBucketMessages,
  getContractTypeLabel,
  getUnitName,
  getVin,
  resolveNotificationBucket,
  type NotificationBucket,
} from './buildBusinessNotificationMessages.js';

const BUCKET_LABELS: Record<NotificationBucket, string> = {
  thirty: '30 días',
  one: '1 día',
  expired: 'Vencidos',
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatDate(value: string | false | null | undefined): string {
  if (!value || typeof value !== 'string') {
    return '—';
  }
  return value;
}

function buildPlatformVinSet(recipients: NotificationRecipient[]): Set<string> {
  const vins = new Set<string>();
  for (const recipient of recipients) {
    for (const vin of recipient.vins) {
      vins.add(vin);
    }
  }
  return vins;
}

function filterContractsByBucket(
  contracts: OdooFleetVehicleLogContractExpiring[],
  bucket: NotificationBucket,
): OdooFleetVehicleLogContractExpiring[] {
  return contracts.filter((contract) => resolveNotificationBucket(contract.days_left) === bucket);
}

function buildMessagesHtml(
  contracts: OdooFleetVehicleLogContractExpiring[],
  bucket: NotificationBucket,
): string {
  const messages = buildBucketMessages(contracts, bucket);
  if (!messages.length) {
    return '<p style="margin: 0; color: #6b7280; font-size: 13px;">No hay avisos en este universo.</p>';
  }

  const items = messages
    .map(
      (message) =>
        `<li style="margin-bottom: 10px; color: #374151; font-size: 13px; line-height: 1.5;">${escapeHtml(message)}</li>`,
    )
    .join('');

  return `<ul style="margin: 0; padding-left: 20px;">${items}</ul>`;
}

function buildTableHtml(
  contracts: OdooFleetVehicleLogContractExpiring[],
  bucket: NotificationBucket,
  platformVins: Set<string>,
): string {
  const bucketContracts = filterContractsByBucket(contracts, bucket);
  if (!bucketContracts.length) {
    return '<p style="margin: 0; color: #6b7280; font-size: 13px;">No hay unidades en este universo.</p>';
  }

  const rows = bucketContracts
    .map((contract) => {
      const unit = getUnitName(contract);
      const vin = getVin(contract);
      const expiration = formatDate(contract.expiration_date);
      const contractType = getContractTypeLabel(contract);
      const onPlatform =
        typeof vin === 'string' && vin !== '—' && platformVins.has(vin) ? 'Sí' : 'No';

      return `<tr>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">${escapeHtml(contractType)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">${escapeHtml(unit)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">${escapeHtml(vin)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">${escapeHtml(expiration)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">${onPlatform}</td>
      </tr>`;
    })
    .join('');

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 13px;">
      <thead>
        <tr style="background: #6A4A9B; color: #ffffff;">
          <th style="padding: 8px; text-align: left;">Tipo</th>
          <th style="padding: 8px; text-align: left;">Unidad</th>
          <th style="padding: 8px; text-align: left;">VIN</th>
          <th style="padding: 8px; text-align: left;">Fecha de expiración</th>
          <th style="padding: 8px; text-align: left;">En plataforma</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function countPlatformMatches(
  contracts: OdooFleetVehicleLogContractExpiring[],
  platformVins: Set<string>,
): number {
  return contracts.filter((contract) => {
    const vin = contract.x_studio_numero_de_chasis_de_la_unidad;
    return typeof vin === 'string' && vin.length > 0 && platformVins.has(vin);
  }).length;
}

function buildTotalsHtml(
  contracts: OdooFleetVehicleLogContractExpiring[],
  platformVins: Set<string>,
): string {
  const buckets: NotificationBucket[] = ['thirty', 'one', 'expired'];
  const platformMatchedTotal = countPlatformMatches(contracts, platformVins);
  const missingOnPlatformTotal = contracts.length - platformMatchedTotal;

  const rows = buckets
    .map((bucket) => {
      const bucketContracts = filterContractsByBucket(contracts, bucket);
      const onPlatform = countPlatformMatches(bucketContracts, platformVins);
      const missing = bucketContracts.length - onPlatform;

      return `<tr>
        <td style="padding: 6px 0; border-bottom: 1px solid #f3f4f6;"><strong>${escapeHtml(BUCKET_LABELS[bucket])}</strong></td>
        <td style="padding: 6px 0; border-bottom: 1px solid #f3f4f6;">${bucketContracts.length}</td>
        <td style="padding: 6px 0; border-bottom: 1px solid #f3f4f6;">${onPlatform}</td>
        <td style="padding: 6px 0; border-bottom: 1px solid #f3f4f6; color: #b45309;">${missing}</td>
      </tr>`;
    })
    .join('');

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 8px; font-size: 13px;">
      <thead>
        <tr style="background: #f9fafb;">
          <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">Universo</th>
          <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">Total</th>
          <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">En plataforma</th>
          <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">Sin registro</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr>
          <td style="padding: 6px 0;"><strong>Total general</strong></td>
          <td style="padding: 6px 0;">${contracts.length}</td>
          <td style="padding: 6px 0;">${platformMatchedTotal}</td>
          <td style="padding: 6px 0; color: #b45309;">${missingOnPlatformTotal}</td>
        </tr>
      </tbody>
    </table>`;
}

export type BusinessNotificationSummaryInput = {
  expiringContracts: OdooFleetVehicleLogContractExpiring[];
  recipients: NotificationRecipient[];
  runId: string;
  jobKey: string;
  environment: string;
};

export function buildBusinessNotificationSummaryVars(
  input: BusinessNotificationSummaryInput,
): Record<string, string> {
  const { expiringContracts, recipients, runId, jobKey, environment } = input;
  const platformVins = buildPlatformVinSet(recipients);
  const runDate = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });

  return {
    runDate,
    totalsHtml: buildTotalsHtml(expiringContracts, platformVins),
    thirtyDayMessagesHtml: buildMessagesHtml(expiringContracts, 'thirty'),
    oneDayMessagesHtml: buildMessagesHtml(expiringContracts, 'one'),
    expiredMessagesHtml: buildMessagesHtml(expiringContracts, 'expired'),
    thirtyDayTableHtml: buildTableHtml(expiringContracts, 'thirty', platformVins),
    oneDayTableHtml: buildTableHtml(expiringContracts, 'one', platformVins),
    expiredTableHtml: buildTableHtml(expiringContracts, 'expired', platformVins),
    jobKey: String(jobKey),
    runId,
    environment,
  };
}
