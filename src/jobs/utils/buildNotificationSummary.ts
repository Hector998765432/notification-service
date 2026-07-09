import type { OdooFleetVehicleLogContractExpiring } from '@/types/odoo/fleets/log.contract/log.contract.js';
import type { NotificationRecipient } from '@/types/supabase/tables.js';
import type { WhatsAppBulkMessageItem } from '@/whatsapp/types.js';
import { uniqueVinsFromContracts } from './formatBulkNotification.js';

function many2oneLabel(value: [number, string] | false | null | undefined): string {
  if (!value || !Array.isArray(value)) {
    return '';
  }
  return String(value[1]);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatDate(value: string | false | null): string {
  if (!value || typeof value !== 'string') {
    return '—';
  }
  return value;
}

export type NotificationSummarySkipped = {
  phone: number;
  contract: number;
  template: number;
  expirationDate: number;
  excludedContractTypes?: number;
};

export type NotificationSummaryBulkResult = {
  total: number;
  succeeded: number;
  failed: number;
};

export type NotificationSummaryInput = {
  expiringContracts: OdooFleetVehicleLogContractExpiring[];
  recipients: NotificationRecipient[];
  whatsAppMessages: WhatsAppBulkMessageItem[];
  bulkResult: NotificationSummaryBulkResult;
  runId: string;
  jobKey: string;
  environment: string;
  skipped: NotificationSummarySkipped;
};

function buildPlatformVinSet(recipients: NotificationRecipient[]): Set<string> {
  const vins = new Set<string>();
  for (const recipient of recipients) {
    for (const vin of recipient.vins) {
      vins.add(vin);
    }
  }
  return vins;
}

function buildContractsByTypeHtml(
  contracts: OdooFleetVehicleLogContractExpiring[],
  platformVins: Set<string>,
): string {
  const grouped = new Map<string, OdooFleetVehicleLogContractExpiring[]>();

  for (const contract of contracts) {
    const typeLabel = many2oneLabel(contract.cost_subtype_id) || 'Sin tipo';
    const list = grouped.get(typeLabel) ?? [];
    list.push(contract);
    grouped.set(typeLabel, list);
  }

  const sections = [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([typeLabel, typeContracts]) => {
      const rows = typeContracts
        .map((contract) => {
          const vin = contract.x_studio_numero_de_chasis_de_la_unidad ?? '—';
          const vehicle = many2oneLabel(contract.vehicle_id) || '—';
          const expiration = formatDate(contract.expiration_date);
          const daysLeft = String(contract.days_left);
          const onPlatform = typeof vin === 'string' && platformVins.has(vin) ? 'Sí' : 'No';

          return `<tr>
            <td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">${escapeHtml(String(vin))}</td>
            <td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">${escapeHtml(vehicle)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">${escapeHtml(expiration)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">${escapeHtml(daysLeft)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">${onPlatform}</td>
          </tr>`;
        })
        .join('');

      return `
        <h3 style="margin: 16px 0 8px; font-size: 14px; color: #374151;">${escapeHtml(typeLabel)} (${typeContracts.length})</h3>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 12px; font-size: 13px;">
          <thead>
            <tr style="background: #f9fafb;">
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">Serial (VIN)</th>
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">Vehículo</th>
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">Expiración</th>
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">Días restantes</th>
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">En plataforma</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`;
    });

  return sections.join('') || '<p style="color: #6b7280;">No hay contratos para mostrar.</p>';
}

function buildMissingVinsSection(
  contracts: OdooFleetVehicleLogContractExpiring[],
  platformVins: Set<string>,
): string {
  const missing = contracts.filter((contract) => {
    const vin = contract.x_studio_numero_de_chasis_de_la_unidad;
    return typeof vin === 'string' && vin.length > 0 && !platformVins.has(vin);
  });

  if (!missing.length) {
    return '';
  }

  const items = missing
    .map((contract) => {
      const vin = contract.x_studio_numero_de_chasis_de_la_unidad ?? '—';
      const typeLabel = many2oneLabel(contract.cost_subtype_id) || 'Sin tipo';
      const vehicle = many2oneLabel(contract.vehicle_id) || '—';
      return `<li style="margin-bottom: 6px;"><strong>${escapeHtml(String(vin))}</strong> · ${escapeHtml(typeLabel)} · ${escapeHtml(vehicle)}</li>`;
    })
    .join('');

  return `
    <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px;">
      <h2 style="margin: 0 0 8px; font-size: 16px; color: #b45309;">VINs sin operador en plataforma</h2>
      <p style="margin: 0 0 8px; color: #92400e; font-size: 13px;">Estos vehículos tienen contrato por vencer en Odoo pero no tienen operador asignado en la plataforma.</p>
      <ul style="margin: 0; padding-left: 20px; color: #78350f;">${items}</ul>
    </div>`;
}

function buildMessagesHtml(
  messages: WhatsAppBulkMessageItem[],
  recipients: NotificationRecipient[],
): string {
  if (!messages.length) {
    return '<p style="color: #6b7280;">No se encolaron mensajes WhatsApp.</p>';
  }

  const recipientByPhone = new Map(
    recipients
      .filter((recipient) => recipient.phone)
      .map((recipient) => [recipient.phone as string, recipient]),
  );

  const rows = messages
    .map((message) => {
      const recipient = recipientByPhone.get(message.to);
      const name = recipient?.name ?? 'Desconocido';
      const vinCount =
        typeof message.templateVars?.count === 'number'
          ? String(message.templateVars.count)
          : recipient
            ? String(recipient.vins.length)
            : '—';

      return `<tr>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">${escapeHtml(name)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">${escapeHtml(message.to)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">${escapeHtml(message.template)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">${escapeHtml(vinCount)}</td>
      </tr>`;
    })
    .join('');

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 13px;">
      <thead>
        <tr style="background: #f9fafb;">
          <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">Destinatario</th>
          <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">Teléfono</th>
          <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">Plantilla</th>
          <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">VINs</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

export function buildNotificationSummaryVars(
  input: NotificationSummaryInput,
): Record<string, string> {
  const { expiringContracts, recipients, whatsAppMessages, bulkResult, runId, jobKey, environment } =
    input;

  const platformVins = buildPlatformVinSet(recipients);
  const platformMatchedTotal = expiringContracts.filter((contract) => {
    const vin = contract.x_studio_numero_de_chasis_de_la_unidad;
    return typeof vin === 'string' && platformVins.has(vin);
  }).length;

  const missingOnPlatformTotal = expiringContracts.length - platformMatchedTotal;
  const runDate = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });

  return {
    runDate,
    odooContractsTotal: String(expiringContracts.length),
    platformMatchedTotal: String(platformMatchedTotal),
    missingOnPlatformTotal: String(missingOnPlatformTotal),
    whatsappQueued: String(bulkResult.total),
    whatsappSucceeded: String(bulkResult.succeeded),
    whatsappFailed: String(bulkResult.failed),
    missingVinsSection: buildMissingVinsSection(expiringContracts, platformVins),
    contractsByTypeHtml: buildContractsByTypeHtml(expiringContracts, platformVins),
    messagesHtml: buildMessagesHtml(whatsAppMessages, recipients),
    jobKey: String(jobKey),
    runId,
    environment,
  };
}

export function countMissingVins(
  expiringContracts: OdooFleetVehicleLogContractExpiring[],
  recipients: NotificationRecipient[],
): number {
  const platformVins = buildPlatformVinSet(recipients);
  return uniqueVinsFromContracts(expiringContracts).filter((vin) => !platformVins.has(vin)).length;
}
