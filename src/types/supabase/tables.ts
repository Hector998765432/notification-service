import type { Database } from '@/types/supabase/database.types.js';

type PublicTables = Database['public']['Tables'];

export type CompanyRow = PublicTables['companies']['Row'];
export type CompanyInsert = PublicTables['companies']['Insert'];
export type CompanyUpdate = PublicTables['companies']['Update'];

export type ProfileRow = PublicTables['profiles']['Row'];
export type ProfileInsert = PublicTables['profiles']['Insert'];
export type ProfileUpdate = PublicTables['profiles']['Update'];

export type CronJobRow = PublicTables['cron_jobs']['Row'];
export type CronJobInsert = PublicTables['cron_jobs']['Insert'];
export type CronJobUpdate = PublicTables['cron_jobs']['Update'];

export type CronJobRunRow = PublicTables['cron_job_runs']['Row'];
export type CronJobRunInsert = PublicTables['cron_job_runs']['Insert'];
export type CronJobRunUpdate = PublicTables['cron_job_runs']['Update'];
