import type { Json } from '@/types/supabase/database.types.js';
import type { CronJobRow, CronJobRunRow } from '@/types/supabase/tables.js';

export type CronJobProvider = CronJobRow['provider'];
export type CronJobStatus = NonNullable<CronJobRow['last_status']>;
export type CronJobRunStatus = CronJobRunRow['status'];
export type CronJobTrigger = CronJobRunRow['triggered_by'];

export interface CronJobExecutionContext<TConfig extends Json = Json> {
  job: CronJobRow;
  config: TConfig;
  runId: string;
  workerId: string;
  triggeredBy: CronJobTrigger;
  signal: AbortSignal;
}

export interface CronJobExecutionResult {
  metadata?: Json;
}

export type CronJobHandler<TConfig extends Json = Json> = (
  context: CronJobExecutionContext<TConfig>
) => Promise<CronJobExecutionResult | void>;
