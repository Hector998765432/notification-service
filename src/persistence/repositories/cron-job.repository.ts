import type { SupabaseAdminClient } from '@/db/supabase/index.js';
import { getSupabaseAdminClient } from '@/db/supabase/index.js';
import type { Json } from '@/types/supabase/index.js';
import type {
  CronJobInsert,
  CronJobRow,
  CronJobRunInsert,
  CronJobRunRow,
  CronJobRunUpdate,
  CronJobUpdate,
} from '@/types/supabase/index.js';
import type { CronJobRunStatus, CronJobTrigger } from '@/types/jobs/index.js';
import type { ReadRepository, WriteRepository } from '@/persistence/repositories/base.repository.js';
import { RepositoryError } from '@/persistence/repositories/repository-error.js';

export interface CompleteCronJobRunInput {
  jobId: string;
  runId: string;
  workerId: string;
  status: Exclude<CronJobRunStatus, 'running'>;
  durationMs: number;
  errorMessage?: string | null;
  metadata?: Json;
}

export interface PaginatedResult<TRow> {
  items: TRow[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

export interface ListCronJobsPaginatedInput {
  limit: number;
  offset: number;
  enabled?: boolean;
}

export interface ListCronJobRunsPaginatedInput {
  jobId: string;
  limit: number;
  offset: number;
}

export class CronJobRepository
  implements ReadRepository<string, CronJobRow>, WriteRepository<CronJobInsert, CronJobUpdate, CronJobRow>
{
  constructor(private readonly client: SupabaseAdminClient = getSupabaseAdminClient()) {}

  async findById(id: string): Promise<CronJobRow | null> {
    const { data, error } = await this.client.from('cron_jobs').select('*').eq('id', id).maybeSingle();

    if (error) {
      throw new RepositoryError(`Unable to load cron job ${id}`, error);
    }

    return data;
  }

  async findByKey(key: string): Promise<CronJobRow | null> {
    const { data, error } = await this.client.from('cron_jobs').select('*').eq('key', key).maybeSingle();

    if (error) {
      throw new RepositoryError(`Unable to load cron job ${key}`, error);
    }

    return data;
  }

  async listPaginated(input: ListCronJobsPaginatedInput): Promise<PaginatedResult<CronJobRow>> {
    const from = input.offset;
    const to = input.offset + input.limit - 1;

    let query = this.client.from('cron_jobs').select('*', { count: 'exact' }).order('key', { ascending: true });

    if (input.enabled !== undefined) {
      query = query.eq('enabled', input.enabled);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      throw new RepositoryError(
        `Unable to list cron jobs: ${error.message}${error.hint ? ` (${error.hint})` : ''}`,
        error
      );
    }

    return {
      items: data ?? [],
      pagination: {
        limit: input.limit,
        offset: input.offset,
        total: count ?? 0,
      },
    };
  }

  async listEnabled(): Promise<CronJobRow[]> {
    const { data, error } = await this.client
      .from('cron_jobs')
      .select('*')
      .eq('enabled', true)
      .order('key', { ascending: true });

    if (error) {
      throw new RepositoryError(
        `Unable to list enabled cron jobs: ${error.message}${error.hint ? ` (${error.hint})` : ''}`,
        error
      );
    }

    return data;
  }

  async create(input: CronJobInsert): Promise<CronJobRow> {
    const { data, error } = await this.client.from('cron_jobs').insert(input).select('*').single();

    if (error) {
      throw new RepositoryError('Unable to create cron job', error);
    }

    return data;
  }

  async delete(id: string): Promise<CronJobRow | null> {
    const { data, error } = await this.client.from('cron_jobs').delete().eq('id', id).select('*').maybeSingle();

    if (error) {
      throw new RepositoryError(`Unable to delete cron job ${id}`, error);
    }

    return data;
  }

  async listRunsPaginated(
    input: ListCronJobRunsPaginatedInput
  ): Promise<PaginatedResult<CronJobRunRow>> {
    const from = input.offset;
    const to = input.offset + input.limit - 1;

    const { data, error, count } = await this.client
      .from('cron_job_runs')
      .select('*', { count: 'exact' })
      .eq('job_id', input.jobId)
      .order('started_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw new RepositoryError(`Unable to list cron job runs for job ${input.jobId}`, error);
    }

    return {
      items: data ?? [],
      pagination: {
        limit: input.limit,
        offset: input.offset,
        total: count ?? 0,
      },
    };
  }

  async update(id: string, input: CronJobUpdate): Promise<CronJobRow> {
    const { data, error } = await this.client
      .from('cron_jobs')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new RepositoryError(`Unable to update cron job ${id}`, error);
    }

    return data;
  }

  async claimJob(jobId: string, workerId: string): Promise<CronJobRow | null> {
    const { data, error } = await this.client.rpc('claim_cron_job', {
      p_job_id: jobId,
      p_worker_id: workerId,
    });

    if (error) {
      throw new RepositoryError(`Unable to claim cron job ${jobId}`, error);
    }

    return data;
  }

  async createRun(input: CronJobRunInsert): Promise<CronJobRunRow> {
    const { data, error } = await this.client.from('cron_job_runs').insert(input).select('*').single();

    if (error) {
      throw new RepositoryError(`Unable to create cron job run for job ${input.job_id}`, error);
    }

    return data;
  }

  async completeRun(input: CompleteCronJobRunInput): Promise<void> {
    const finishedAt = new Date().toISOString();
    const runUpdate: CronJobRunUpdate = {
      status: input.status,
      finished_at: finishedAt,
      duration_ms: input.durationMs,
      error_message: input.errorMessage ?? null,
      metadata: input.metadata ?? {},
    };

    const { error: runError } = await this.client
      .from('cron_job_runs')
      .update(runUpdate)
      .eq('id', input.runId);

    if (runError) {
      throw new RepositoryError(`Unable to complete cron job run ${input.runId}`, runError);
    }

    const { error: jobError } = await this.client
      .from('cron_jobs')
      .update({
        lock_owner: null,
        locked_until: null,
        last_run_at: finishedAt,
        last_status: input.status,
        last_error: input.errorMessage ?? null,
        updated_at: finishedAt,
      })
      .eq('id', input.jobId)
      .eq('lock_owner', input.workerId);

    if (jobError) {
      throw new RepositoryError(`Unable to release cron job ${input.jobId}`, jobError);
    }
  }

  async releaseJobLock(jobId: string, workerId: string, errorMessage?: string): Promise<void> {
    const { error } = await this.client
      .from('cron_jobs')
      .update({
        lock_owner: null,
        locked_until: null,
        last_status: errorMessage ? 'failed' : null,
        last_error: errorMessage ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .eq('lock_owner', workerId);

    if (error) {
      throw new RepositoryError(`Unable to release cron job lock ${jobId}`, error);
    }
  }

  buildRun(job: CronJobRow, workerId: string, triggeredBy: CronJobTrigger): CronJobRunInsert {
    return {
      job_id: job.id,
      status: 'running',
      triggered_by: triggeredBy,
      worker_id: workerId,
      metadata: {
        job_key: job.key,
        task_key: job.task_key,
      },
    };
  }
}
