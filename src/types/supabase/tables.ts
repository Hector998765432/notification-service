import type { Database } from '@/types/supabase/database.types.js';

type PublicTables = Database['public']['Tables'];

export type CompanyRow = PublicTables['companies']['Row'];
export type CompanyInsert = PublicTables['companies']['Insert'];
export type CompanyUpdate = PublicTables['companies']['Update'];

export type ProfileRow = PublicTables['profiles']['Row'];
export type ProfileInsert = PublicTables['profiles']['Insert'];
export type ProfileUpdate = PublicTables['profiles']['Update'];

export type CompanyMemberRow = PublicTables['company_members']['Row'];
export type CompanyMemberUnitRow = PublicTables['company_member_units']['Row'];

export type CompanyMemberWithUnits = {
  id: string;
  companyId: string;
  profileId: string;
  profile: Pick<ProfileRow, 'id' | 'username' | 'phone'>;
  company: Pick<CompanyRow, 'id' | 'name' | 'odoo_partner_id'>;
  roleSlug: string;
  vins: string[];
};

export type NotificationRecipient = {
  name: string;
  phone: string | null;
  companyId: string;
  companyName: string;
  odooPartnerId: number;
  memberId: string;
  profileId: string;
  roleSlug: string;
  vins: string[];
};

/** @deprecated Use NotificationRecipient instead */
export type NotificationOperator = NotificationRecipient & { vin: string };

export type CronJobRow = PublicTables['cron_jobs']['Row'];
export type CronJobInsert = PublicTables['cron_jobs']['Insert'];
export type CronJobUpdate = PublicTables['cron_jobs']['Update'];

export type CronJobRunRow = PublicTables['cron_job_runs']['Row'];
export type CronJobRunInsert = PublicTables['cron_job_runs']['Insert'];
export type CronJobRunUpdate = PublicTables['cron_job_runs']['Update'];

export type WhatsAppMessageContextRow = PublicTables['whatsapp_message_context']['Row'];
export type WhatsAppMessageContextInsert = PublicTables['whatsapp_message_context']['Insert'];
export type WhatsAppMessageContextUpdate = PublicTables['whatsapp_message_context']['Update'];

export type TemplateClassificationRow = PublicTables['template_classifications']['Row'];
export type TemplateClassificationInsert = PublicTables['template_classifications']['Insert'];
export type TemplateClassificationUpdate = PublicTables['template_classifications']['Update'];

export type NotificationTemplateRow = PublicTables['notification_templates']['Row'];
export type NotificationTemplateInsert = PublicTables['notification_templates']['Insert'];
export type NotificationTemplateUpdate = PublicTables['notification_templates']['Update'];

export type NotificationTemplateWithClassification = NotificationTemplateRow & {
  classificationName: string;
};

export type NotificationTemplateChannel = NotificationTemplateRow['channel'];
