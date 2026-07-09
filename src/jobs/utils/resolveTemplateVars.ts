import type { NotificationRecipient } from '@/types/supabase/tables.js';
import type { OdooFleetVehicleLogContractExpiring } from '@/types/odoo/fleets/log.contract/log.contract.js';
import { ContractType } from '@/types/supabase/contracts.types.js';
import {
    formatContractList,
    formatSerialList,
    uniqueVinsFromContracts,
} from './formatBulkNotification.js';

export function buildGlobalBulkTemplateVars(input: {
    recipient: NotificationRecipient;
    contracts: OdooFleetVehicleLogContractExpiring[];
    contactNumber: string;
}): Record<string, unknown> {
    const { recipient, contracts, contactNumber } = input;
    const vins = uniqueVinsFromContracts(contracts);

    return {
        name: recipient.name,
        count: vins.length,
        serial_list: formatSerialList(vins),
        contract_list: formatContractList(contracts),
        phone_number: contactNumber,
    };
}

export function buildContractTemplateVars(input: {
    recipient: NotificationRecipient;
    vin: string;
    carName: string;
    expirationDate: string | false | null;
    type: ContractType;
    templateName: string;
    contactNumber: string;
    emailContactNumber: string;
}): Record<string, unknown> | undefined {
    const { recipient, vin, carName, expirationDate, type, templateName, contactNumber, emailContactNumber } = input;
    const tomorrow = new Date(
        new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" })
    );
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowFormatted = tomorrow.toISOString().split('T')[0];
    switch (type) {
        case ContractType.CAR_INSURANCE:
            if (templateName === 'auto_service_main') {
                return {
                    client_name: recipient.name,
                    unit_name: carName,
                    vin,
                    timestamp: tomorrowFormatted,
                    contact_number: contactNumber,
                    email: emailContactNumber,
                };
            }
            if (templateName === 'auto_service_day_before') {
                return {
                    client_name: recipient.name,
                    timestamp: tomorrowFormatted,
                    car_name: carName,
                    phone_number: contactNumber,
                };
            }
            if (templateName === 'auto_service_recurrent') {
                return {
                    client_name: recipient.name,
                    car_name: carName,
                    timestamp: expirationDate ? new Date(expirationDate).toISOString().split('T')[0] : '',
                    phone_number: contactNumber,
                };
            }
        case ContractType.ANNUAL_TENURE:
            if (templateName === 'vehicle_tax') {
                return {
                    client_name: recipient.name,
                    car_name: carName,
                    // do not try to correct variable name, it is already correct 'timepstamp' is ok
                    timepstamp: expirationDate ? new Date(expirationDate).toISOString().split('T')[0] : '',
                    phone_number: contactNumber,
                };
            }
            if (templateName === 'vehicle_tax_day_before') {
                return {
                    client_name: recipient.name,
                    car_name: carName,
                    timestamp: tomorrowFormatted,
                    phone_number: contactNumber,
                };
            }
            if (templateName === 'recurrent_vehicle_tax') {
                return {
                    client_name: recipient.name,
                    car_name: carName,
                    // do not try to correct variable name, it is already correct 'timepstamp' is ok
                    timepstamp: expirationDate ? new Date(expirationDate).toISOString().split('T')[0] : '',
                    phone_number: contactNumber,
                };
            }
        case ContractType.CAR_VERIFICATION:
            if (templateName === 'car_verification_main') {
                return {
                    client_name: recipient.name,
                    car_name: carName,
                    timestamp: expirationDate ? new Date(expirationDate).toISOString().split('T')[0] : '',
                    phone_number: contactNumber,
                    vin,
                };
            }
            if (templateName === 'car_verification_day_before') {
                return {
                    client_name: recipient.name,
                    car_name: carName,
                    timestamp: tomorrowFormatted,
                    phone_number: contactNumber,
                };
            }
            if (templateName === 'car_verification_recurrent') {
                return {
                    client_name: recipient.name,
                    car_name: carName,
                    timestamp: expirationDate ? new Date(expirationDate).toISOString().split('T')[0] : '',
                    phone_number: contactNumber,
                };
            }
        case ContractType.LEASING:
            if (templateName === 'leasing_main') {
                return {
                    client_name: recipient.name,
                    timestamp: expirationDate ? new Date(expirationDate).toISOString().split('T')[0] : '',
                    car_name: carName,
                    phone_number: contactNumber,
                    vin,
                    email: emailContactNumber,
                };
            }
            if (templateName === 'leasing_day_before') {
                return {
                    client_name: recipient.name,
                    timestamp: expirationDate ? new Date(expirationDate).toISOString().split('T')[0] : '',
                    car_name: carName,
                    phone_number: contactNumber,
                };
            }
            if (templateName === 'leasing_recurrent') {
                return {
                    client_name: recipient.name,
                    car_name: carName,
                    timestamp: expirationDate ? new Date(expirationDate).toISOString().split('T')[0] : '',
                    phone_number: contactNumber,
                };
            }
        case ContractType.CAR_CARD:
            if (templateName === 'car_card_main') {
                return {
                    client_name: recipient.name,
                    timestamp: expirationDate ? new Date(expirationDate).toISOString().split('T')[0] : '',
                    car_name: carName,
                    phone_number: contactNumber,
                    vin,
                    email: emailContactNumber,
                };
            }
            if (templateName === 'car_card_day_before') {
                return {
                    client_name: recipient.name,
                    timestamp: tomorrowFormatted,
                    car_name: carName,
                    phone_number: contactNumber,
                };
            }
            if (templateName === 'car_card_recurrent') {
                return {
                    client_name: recipient.name,
                    timestamp: expirationDate ? new Date(expirationDate).toISOString().split('T')[0] : '',
                    car_name: carName,
                    phone_number: contactNumber,
                };
            }
            break;
        default:
            return undefined;
    }
    return undefined;
}