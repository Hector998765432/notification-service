import { getOdooClient, type OdooJsonRpcClient } from '@/db/odoo/odoo.js';
import type { OdooFleetVehicle } from '@/types/odoo/fleets/vehicle/vehicle.js';
import type {
  OdooFleetVehicleLogContract,
  OdooFleetVehicleLogContractExpiring,
} from '@/types/odoo/fleets/log.contract/log.contract.js';

function isExpiringDaysLeft(daysLeft: number): boolean {
  return daysLeft === 30 || daysLeft === 1 || daysLeft <= 0;
}

export interface OdooFleetQueryOptions {
  odooPartnerId?: number;
}

export class OdooFleetRepository {
  constructor(private readonly client: OdooJsonRpcClient = getOdooClient()) {}

  async getVehicles(options?: OdooFleetQueryOptions): Promise<OdooFleetVehicle[]> {
    const domain = options?.odooPartnerId != null ? [['driver_id', '=', options.odooPartnerId]] : [];

    return this.client.call<OdooFleetVehicle[]>('fleet.vehicle', 'search_read', [domain], {
      fields: [
        'name',
        'license_plate',
        'vin_sn',
        'model_id',
        'brand_id',
        'driver_id',
        'state_id',
        'location',
        'seats',
        'doors',
        'color',
        'model_year',
        'acquisition_date',
        'first_contract_date',
        'odometer',
        'odometer_unit',
        'fuel_type',
        'horsepower',
        'horsepower_tax',
        'power',
        'co2',
        'company_id',
        'active',
        'car_value',
        'residual_value',
        'plan_to_change_car',
        'x_studio_nombre_del_usuario',
      ],
      limit: 10000,
    });
  }

  async getContractVehiclesByVinSn(vinSn: string): Promise<OdooFleetVehicleLogContract[]> {
    return this.client.call<OdooFleetVehicleLogContract[]>(
      'fleet.vehicle.log.contract',
      'search_read',
      [[['x_studio_numero_de_chasis_de_la_unidad', '=', vinSn]]],
      {}
    );
  }

  async getContractVehiclesStats(
    options?: OdooFleetQueryOptions
  ): Promise<OdooFleetVehicleLogContract[]> {
    const domain = [
      // ['state', '=', 'open'], // TODO: decide if closed contracts should be ignored.
      ...(options?.odooPartnerId != null ? [['purchaser_id', '=', options.odooPartnerId]] : []),
    ];

    return this.client.call<OdooFleetVehicleLogContract[]>(
      'fleet.vehicle.log.contract',
      'search_read',
      [domain],
      {
        fields: [
          'vehicle_id',
          'days_left',
          'state',
          'expires_today',
          'start_date',
          'expiration_date',
          'x_studio_numero_de_chasis_de_la_unidad',
        ],
      }
    );
  }

  async getExpiringContracts(): Promise<OdooFleetVehicleLogContractExpiring[]> {
    const domain = [
      ['active', '=', true],
      ['state', '=', 'open'],
    ];

    const contracts = await this.client.call<OdooFleetVehicleLogContractExpiring[]>(
      'fleet.vehicle.log.contract',
      'search_read',
      [domain],
      {
        fields: [
          'cost_subtype_id',
          'expiration_date',
          'vehicle_id',
          'purchaser_id',
          'x_studio_numero_de_chasis_de_la_unidad',
          'days_left',
        ],
        limit: 10000,
      }
    );

    return contracts.filter((contract) => isExpiringDaysLeft(contract.days_left));
  }
}

export const odooFleetRepository = new OdooFleetRepository();

export async function getVehicles(options?: OdooFleetQueryOptions): Promise<OdooFleetVehicle[]> {
  return odooFleetRepository.getVehicles(options);
}

export async function getContractVehiclesByVinSn(
  vinSn: string
): Promise<OdooFleetVehicleLogContract[]> {
  return odooFleetRepository.getContractVehiclesByVinSn(vinSn);
}

export async function getContractVehiclesStats(
  options?: OdooFleetQueryOptions
): Promise<OdooFleetVehicleLogContract[]> {
  return odooFleetRepository.getContractVehiclesStats(options);
}

export async function getExpiringContracts(): Promise<OdooFleetVehicleLogContractExpiring[]> {
  return odooFleetRepository.getExpiringContracts();
}
