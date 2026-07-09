import type { OdooFleetVehicleLogContractExpiring } from '@/types/odoo/fleets/log.contract/log.contract.js';
import { ContractType } from '@/types/supabase/contracts.types.js';

const EXCLUDED_CONTRACT_TYPES = new Set<string>([ContractType.INSURANCE, ContractType.GPS]);

function many2oneLabel(value: [number, string] | false | null | undefined): string {
  if (!value || !Array.isArray(value)) {
    return '';
  }
  return String(value[1]);
}

export function getContractTypeLabel(contract: OdooFleetVehicleLogContractExpiring): string {
  return many2oneLabel(contract.cost_subtype_id);
}

/** Póliza de seguro y Gps no reciben notificación (ni bulk ni individual). */
export function isNotifiableContract(contract: OdooFleetVehicleLogContractExpiring): boolean {
  const label = getContractTypeLabel(contract);
  return label.length > 0 && !EXCLUDED_CONTRACT_TYPES.has(label);
}

export function filterNotifiableContracts(
  contracts: OdooFleetVehicleLogContractExpiring[],
): OdooFleetVehicleLogContractExpiring[] {
  return contracts.filter(isNotifiableContract);
}

export function formatSerialList(vins: string[]): string {
  if (vins.length <= 2) {
    return vins.join(',');
  }

  const visible = vins.slice(0, 3).join(',');
  const remaining = vins.length - 3;
  return `${visible}, +${remaining} más`;
}

export function formatContractList(contracts: OdooFleetVehicleLogContractExpiring[]): string {
  const labels = new Set<string>();

  for (const contract of contracts) {
    const label = many2oneLabel(contract.cost_subtype_id);
    if (label) {
      labels.add(label);
    }
  }

  return [...labels].join(', ');
}

export function shouldUseBulkNotification(
  contracts: OdooFleetVehicleLogContractExpiring[],
  vins: string[],
): boolean {
  return contracts.length >= 2 || vins.length >= 2;
}

export function contractsForVins(
  contracts: OdooFleetVehicleLogContractExpiring[],
  vins: string[],
): OdooFleetVehicleLogContractExpiring[] {
  const vinSet = new Set(vins);
  return contracts.filter((contract) => {
    const vin = contract.x_studio_numero_de_chasis_de_la_unidad;
    return typeof vin === 'string' && vinSet.has(vin);
  });
}

export function uniqueVinsFromContracts(
  contracts: OdooFleetVehicleLogContractExpiring[],
): string[] {
  return [
    ...new Set(
      contracts
        .map((contract) => contract.x_studio_numero_de_chasis_de_la_unidad)
        .filter((vin): vin is string => typeof vin === 'string' && vin.length > 0),
    ),
  ];
}
