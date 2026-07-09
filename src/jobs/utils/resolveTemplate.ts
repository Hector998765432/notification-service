import { NotificationTemplateWithClassification } from "@/types/supabase/tables.js";
import { ContractType } from "@/types/supabase/contracts.types.js";
type ScheduleType = 'main' | 'recurring';
export function resolveWhatsAppTemplate(
    templates: NotificationTemplateWithClassification[],
    contractType: ContractType,
    daysLeft: number,
    type: ContractType,
    scheduleType: ScheduleType
): NotificationTemplateWithClassification | null {
    const globalChannel = 'whatsapp';
    switch (type) {
        case ContractType.CAR_INSURANCE:
            if (daysLeft === 30) {
                return templates.find((template) => template.name === 'auto_service_main' && template.channel === globalChannel) ?? null;
            }
            if (daysLeft === 1) {
                return templates.find((template) => template.name === 'auto_service_day_before' && template.channel === globalChannel) ?? null;
            }
            if (scheduleType === 'recurring' && daysLeft <= 0) {
                return templates.find((template) => template.name === 'auto_service_recurrent' && template.channel === globalChannel) ?? null;
            }
            break;
        case ContractType.ANNUAL_TENURE:
            if (daysLeft === 30) {
                return templates.find((template) => template.name === 'vehicle_tax' && template.channel === globalChannel) ?? null;
            }
            if (daysLeft === 1) {
                return templates.find((template) => template.name === 'vehicle_tax_day_before' && template.channel === globalChannel) ?? null;
            }
            if (scheduleType === 'recurring' && daysLeft <= 0) {
                return templates.find((template) => template.name === 'recurrent_vehicle_tax' && template.channel === globalChannel) ?? null;
            }
            break;
        case ContractType.CAR_VERIFICATION:
            if (daysLeft === 30) {
                return templates.find((template) => template.name === 'car_verification_main' && template.channel === globalChannel) ?? null;
            }
            if (daysLeft === 1) {
                return templates.find((template) => template.name === 'car_verification_day_before' && template.channel === globalChannel) ?? null;
            }
            if (scheduleType === 'recurring' && daysLeft <= 0) {
                return templates.find((template) => template.name === 'car_verification_recurrent' && template.channel === globalChannel) ?? null;
            }
            break;
        case ContractType.LEASING:
            if (daysLeft === 30) {
                return templates.find((template) => template.name === 'leasing_main' && template.channel === globalChannel) ?? null;
            }
            if (daysLeft === 1) {
                return templates.find((template) => template.name === 'leasing_day_before' && template.channel === globalChannel) ?? null;
            }
            if (scheduleType === 'recurring' && daysLeft <= 0) {
                return templates.find((template) => template.name === 'leasing_recurrent' && template.channel === globalChannel) ?? null;
            }
            break;
        case ContractType.CAR_CARD:
            if (daysLeft === 30) {
                return templates.find((template) => template.name === 'car_card_main' && template.channel === globalChannel) ?? null;
            }
            if (daysLeft === 1) {
                return templates.find((template) => template.name === 'car_card_day_before' && template.channel === globalChannel) ?? null;
            }
            if (scheduleType === 'recurring' && daysLeft <= 0) {
                return templates.find((template) => template.name === 'car_card_recurrent' && template.channel === globalChannel) ?? null;
            }
            break;
        default:
            return null;
    }

    return (
        templates.find((template) => template.name === contractType && template.channel === globalChannel) ??
        null
    );
}

export function resolveGlobalBulkTemplate(
    templates: NotificationTemplateWithClassification[],
): NotificationTemplateWithClassification | null {
    return templates.find((template) => template.name === 'global_bulk' && template.channel === 'whatsapp') ?? null;
}