import type { OdooFleetVehicleLogContractExpiring } from '@/types/odoo/fleets/log.contract/log.contract.js';
import { ContractType } from '@/types/supabase/contracts.types.js';

export type NotificationBucket = 'thirty' | 'one' | 'expired';

export type ContractGroup = {
  contractType: string;
  clientName: string;
  contracts: OdooFleetVehicleLogContractExpiring[];
};

function many2oneLabel(value: [number, string] | false | null | undefined): string {
  if (!value || !Array.isArray(value)) {
    return '';
  }
  return String(value[1]);
}

function formatDate(value: string | false | null | undefined): string {
  if (!value || typeof value !== 'string') {
    return '—';
  }
  return value;
}

function formatList(items: string[]): string {
  if (items.length <= 2) {
    return items.join(', ');
  }
  return `${items.slice(0, 3).join(', ')}, +${items.length - 3} más`;
}

export function resolveNotificationBucket(daysLeft: number): NotificationBucket | null {
  if (daysLeft === 30) {
    return 'thirty';
  }
  if (daysLeft === 1) {
    return 'one';
  }
  if (daysLeft <= 0) {
    return 'expired';
  }
  return null;
}

export function getClientName(contract: OdooFleetVehicleLogContractExpiring): string {
  return many2oneLabel(contract.purchaser_id) || 'Sin cliente asignado';
}

export function getContractTypeLabel(contract: OdooFleetVehicleLogContractExpiring): string {
  return many2oneLabel(contract.cost_subtype_id) || 'Sin tipo';
}

export function getUnitName(contract: OdooFleetVehicleLogContractExpiring): string {
  return many2oneLabel(contract.vehicle_id) || '—';
}

export function getVin(contract: OdooFleetVehicleLogContractExpiring): string {
  const vin = contract.x_studio_numero_de_chasis_de_la_unidad;
  return typeof vin === 'string' && vin.length > 0 ? vin : '—';
}

export function groupContractsForMessages(
  contracts: OdooFleetVehicleLogContractExpiring[],
  bucket: NotificationBucket,
): ContractGroup[] {
  const filtered = contracts.filter((contract) => resolveNotificationBucket(contract.days_left) === bucket);
  const groups = new Map<string, ContractGroup>();

  for (const contract of filtered) {
    const contractType = getContractTypeLabel(contract);
    const clientName = getClientName(contract);
    const key = `${contractType}::${clientName}`;
    const existing = groups.get(key);

    if (existing) {
      existing.contracts.push(contract);
      continue;
    }

    groups.set(key, { contractType, clientName, contracts: [contract] });
  }

  return [...groups.values()].sort((a, b) => {
    const typeCompare = a.contractType.localeCompare(b.contractType);
    if (typeCompare !== 0) {
      return typeCompare;
    }
    return a.clientName.localeCompare(b.clientName);
  });
}

type MessageParts = {
  units: string[];
  vins: string[];
  clientName: string;
  expirationDate: string;
  count: number;
  plural: boolean;
};

function buildMessageParts(group: ContractGroup): MessageParts {
  const units = group.contracts.map(getUnitName);
  const vins = group.contracts.map(getVin);
  const expirationDate = formatDate(group.contracts[0]?.expiration_date);
  const count = group.contracts.length;

  return {
    units,
    vins,
    clientName: group.clientName,
    expirationDate,
    count,
    plural: count > 1,
  };
}

function unitPhrase(parts: MessageParts): string {
  if (!parts.plural) {
    return `del activo ${parts.units[0]}`;
  }
  return `de ${parts.count} activos (${formatList(parts.units)})`;
}

function unitPhraseWithoutVin(parts: MessageParts): string {
  if (!parts.plural) {
    return `del activo ${parts.units[0]}`;
  }
  return `de ${parts.count} activos (${formatList(parts.units)})`;
}

function vinPhrase(parts: MessageParts): string {
  if (!parts.plural) {
    return `, serie ${parts.vins[0]}`;
  }
  return `, series (${formatList(parts.vins)})`;
}

function clientPhrase(parts: MessageParts): string {
  return `del cliente ${parts.clientName}`;
}

function buildThirtyDayMessage(contractType: string, parts: MessageParts): string {
  switch (contractType) {
    case ContractType.CAR_INSURANCE:
      return `Aviso interno: el servicio automotriz ${unitPhrase(parts)}${vinPhrase(parts)}, ${clientPhrase(parts)} vence el ${parts.expirationDate}. Favor de dar seguimiento.`;
    case ContractType.INSURANCE:
      return `Aviso interno: la póliza de seguro ${unitPhrase(parts)}${vinPhrase(parts)}, ${clientPhrase(parts)} vence el ${parts.expirationDate}.`;
    case ContractType.ANNUAL_TENURE:
      return `Aviso interno: la tenencia anual ${unitPhrase(parts)}${vinPhrase(parts)}, ${clientPhrase(parts)} vence el ${parts.expirationDate}.`;
    case ContractType.GPS:
      return `Aviso interno: el dispositivo GPS ${unitPhrase(parts)}${vinPhrase(parts)}, ${clientPhrase(parts)} requiere atención antes del ${parts.expirationDate}.`;
    case ContractType.CAR_VERIFICATION:
      return `Aviso interno: la verificación vehicular ${unitPhraseWithoutVin(parts)}, ${clientPhrase(parts)}, vence el ${parts.expirationDate}.`;
    case ContractType.LEASING:
      return `Aviso interno: el contrato de leasing ${unitPhraseWithoutVin(parts)}, ${clientPhrase(parts)}, vence el ${parts.expirationDate}. Pendiente confirmar si se renueva o se recupera el activo.`;
    case ContractType.CAR_CARD:
      return `Aviso interno: la tarjeta de circulación ${unitPhraseWithoutVin(parts)}, ${clientPhrase(parts)}, vence el ${parts.expirationDate}.`;
    default:
      return `Aviso interno: el contrato (${contractType}) ${unitPhrase(parts)}${vinPhrase(parts)}, ${clientPhrase(parts)} vence el ${parts.expirationDate}.`;
  }
}

function buildOneDayMessage(contractType: string, parts: MessageParts): string {
  switch (contractType) {
    case ContractType.ANNUAL_TENURE:
      return parts.plural
        ? `Aviso interno: mañana ${parts.expirationDate} vence la tenencia anual ${unitPhraseWithoutVin(parts)} ${clientPhrase(parts)}.`
        : `Aviso interno: mañana ${parts.expirationDate} vence la tenencia anual del activo ${parts.units[0]} ${clientPhrase(parts)}.`;
    case ContractType.GPS:
      return parts.plural
        ? `Aviso interno: mañana ${parts.expirationDate} vence el plazo de atención del GPS ${unitPhraseWithoutVin(parts)}, ${clientPhrase(parts)}.`
        : `Aviso interno: mañana ${parts.expirationDate} vence el plazo de atención del GPS del activo ${parts.units[0]}, ${clientPhrase(parts)}.`;
    case ContractType.CAR_VERIFICATION:
      return parts.plural
        ? `Aviso interno: mañana ${parts.expirationDate} vence el plazo de verificación vehicular ${unitPhraseWithoutVin(parts)}, ${clientPhrase(parts)}.`
        : `Aviso interno: mañana ${parts.expirationDate} vence el plazo de verificación vehicular del activo ${parts.units[0]}, ${clientPhrase(parts)}.`;
    case ContractType.LEASING:
      return parts.plural
        ? `Aviso interno: mañana ${parts.expirationDate} vence el contrato de leasing ${unitPhraseWithoutVin(parts)}, ${clientPhrase(parts)}. Confirmar estatus de renovación o recuperación.`
        : `Aviso interno: mañana ${parts.expirationDate} vence el contrato de leasing del activo ${parts.units[0]}, ${clientPhrase(parts)}. Confirmar estatus de renovación o recuperación.`;
    case ContractType.CAR_CARD:
      return parts.plural
        ? `Aviso interno: mañana ${parts.expirationDate} vence la tarjeta de circulación ${unitPhraseWithoutVin(parts)}, ${clientPhrase(parts)}.`
        : `Aviso interno: mañana ${parts.expirationDate} vence la tarjeta de circulación del activo ${parts.units[0]}, ${clientPhrase(parts)}.`;
    default:
      return buildThirtyDayMessage(contractType, parts).replace('vence el', 'vence mañana');
  }
}

function buildExpiredMessage(contractType: string, parts: MessageParts): string {
  switch (contractType) {
    case ContractType.GPS:
      return parts.plural
        ? `Aviso interno: el plazo de atención del GPS ${unitPhraseWithoutVin(parts)}, ${clientPhrase(parts)}, venció el ${parts.expirationDate}.`
        : `Aviso interno: el plazo de atención del GPS del activo ${parts.units[0]}, ${clientPhrase(parts)}, venció el ${parts.expirationDate}.`;
    case ContractType.CAR_INSURANCE:
      return `Aviso interno: el servicio automotriz ${unitPhrase(parts)}${vinPhrase(parts)}, ${clientPhrase(parts)} venció el ${parts.expirationDate}. Favor de dar seguimiento.`;
    case ContractType.INSURANCE:
      return `Aviso interno: la póliza de seguro ${unitPhrase(parts)}${vinPhrase(parts)}, ${clientPhrase(parts)} venció el ${parts.expirationDate}.`;
    case ContractType.ANNUAL_TENURE:
      return `Aviso interno: la tenencia anual ${unitPhrase(parts)}${vinPhrase(parts)}, ${clientPhrase(parts)} venció el ${parts.expirationDate}.`;
    case ContractType.CAR_VERIFICATION:
      return `Aviso interno: la verificación vehicular ${unitPhraseWithoutVin(parts)}, ${clientPhrase(parts)}, venció el ${parts.expirationDate}.`;
    case ContractType.LEASING:
      return `Aviso interno: el contrato de leasing ${unitPhraseWithoutVin(parts)}, ${clientPhrase(parts)}, venció el ${parts.expirationDate}. Confirmar estatus de renovación o recuperación.`;
    case ContractType.CAR_CARD:
      return `Aviso interno: la tarjeta de circulación ${unitPhraseWithoutVin(parts)}, ${clientPhrase(parts)}, venció el ${parts.expirationDate}.`;
    default:
      return `Aviso interno: el contrato (${contractType}) ${unitPhrase(parts)}${vinPhrase(parts)}, ${clientPhrase(parts)} venció el ${parts.expirationDate}.`;
  }
}

export function buildGroupMessage(group: ContractGroup, bucket: NotificationBucket): string {
  const parts = buildMessageParts(group);

  switch (bucket) {
    case 'thirty':
      return buildThirtyDayMessage(group.contractType, parts);
    case 'one':
      return buildOneDayMessage(group.contractType, parts);
    case 'expired':
      return buildExpiredMessage(group.contractType, parts);
    default:
      return buildThirtyDayMessage(group.contractType, parts);
  }
}

export function buildBucketMessages(
  contracts: OdooFleetVehicleLogContractExpiring[],
  bucket: NotificationBucket,
): string[] {
  return groupContractsForMessages(contracts, bucket).map((group) => buildGroupMessage(group, bucket));
}
