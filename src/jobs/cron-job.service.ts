import cron from 'node-cron';
import { AppError } from '@/errors/AppError.js';
import { formatLogError } from '@/logging/format-log-error.js';
import { getLogger } from '@/logging/logger.js';
import type { CronJobRepository } from '@/persistence/repositories/index.js';
import { RepositoryError } from '@/persistence/repositories/repository-error.js';
import type { CronJobInsert, CronJobRow, CronJobRunRow, CronJobUpdate } from '@/types/supabase/index.js';
import type { CronJobRunStatus } from '@/types/jobs/index.js';
import type { DynamicCronScheduler } from '@/jobs/dynamic-cron-scheduler.js';
import type { JobRegistry } from '@/jobs/job-registry.js';
import type { JobRunner } from '@/jobs/job-runner.js';

const log = getLogger('jobs.cron-job-service');

const PROVIDERS = ['odoo', 'supabase', 'internal'] as const;
type CronJobProvider = (typeof PROVIDERS)[number];

export interface CronJobServiceOptions {
  repository: CronJobRepository;
  registry: JobRegistry;
  runner: JobRunner;
  scheduler: DynamicCronScheduler;
}

export interface CronJobListInput {
  limit: number;
  offset: number;
  enabled?: boolean;
}

export interface CronJobRunsListInput {
  jobId: string;
  limit: number;
  offset: number;
}

export interface CronJobRunResponse {
  status: CronJobRunStatus;
  runId?: string;
}

export class CronJobService {
  constructor(private readonly options: CronJobServiceOptions) {}

  async list(input: CronJobListInput) {
    return this.options.repository.listPaginated(input);
  }

  async getById(id: string): Promise<CronJobRow> {
    const job = await this.options.repository.findById(id);
    if (!job) {
      throw new AppError(`Cron job ${id} not found`, 404, 'CRON_JOB_NOT_FOUND');
    }
    return job;
  }

  async create(input: CronJobInsert): Promise<CronJobRow> {
    this.validateCreateInput(input);

    try {
      const job = await this.options.repository.create(input);
      await this.reconcileScheduler();
      return job;
    } catch (err) {
      throw this.mapRepositoryError(err, 'Unable to create cron job');
    }
  }

  async update(id: string, input: CronJobUpdate): Promise<CronJobRow> {
    const existing = await this.getById(id);
    this.validateUpdateInput(input, existing);

    try {
      const job = await this.options.repository.update(id, input);
      await this.reconcileScheduler();
      return job;
    } catch (err) {
      throw this.mapRepositoryError(err, `Unable to update cron job ${id}`);
    }
  }

  async delete(id: string): Promise<CronJobRow> {
    await this.getById(id);

    try {
      const deleted = await this.options.repository.delete(id);
      if (!deleted) {
        throw new AppError(`Cron job ${id} not found`, 404, 'CRON_JOB_NOT_FOUND');
      }
      await this.reconcileScheduler();
      return deleted;
    } catch (err) {
      if (err instanceof AppError) {
        throw err;
      }
      throw this.mapRepositoryError(err, `Unable to delete cron job ${id}`);
    }
  }

  async pause(id: string): Promise<CronJobRow> {
    return this.update(id, { enabled: false });
  }

  async resume(id: string): Promise<CronJobRow> {
    const job = await this.getById(id);
    this.assertTaskKeyRegistered(job.task_key);
    return this.update(id, { enabled: true });
  }

  async run(id: string): Promise<CronJobRunResponse> {
    const job = await this.getById(id);
    this.assertTaskKeyRegistered(job.task_key);

    if (!job.enabled) {
      throw new AppError(
        'Cron job is paused. Resume it before running manually.',
        409,
        'CRON_JOB_RUN_SKIPPED',
        { job_id: job.id, enabled: job.enabled }
      );
    }

    const result = await this.options.runner.run(job.id, 'manual');

    if (result.status === 'skipped') {
      throw new AppError(
        'Cron job could not be claimed. It may be disabled, already running, or locked by another worker.',
        409,
        'CRON_JOB_RUN_SKIPPED',
        result
      );
    }

    return result;
  }

  async listRuns(input: CronJobRunsListInput): Promise<{
    items: CronJobRunRow[];
    pagination: { limit: number; offset: number; total: number };
  }> {
    await this.getById(input.jobId);

    try {
      return await this.options.repository.listRunsPaginated(input);
    } catch (err) {
      throw this.mapRepositoryError(err, `Unable to list runs for cron job ${input.jobId}`);
    }
  }

  private validateCreateInput(input: CronJobInsert): void {
    this.assertNonBlank('key', input.key);
    this.assertNonBlank('name', input.name);
    this.assertNonBlank('task_key', input.task_key);
    this.assertNonBlank('schedule', input.schedule);
    this.assertProvider(input.provider);
    this.assertSchedule(input.schedule);
    this.assertTaskKeyRegistered(input.task_key);

    if (input.max_runtime_seconds !== undefined) {
      this.assertMaxRuntime(input.max_runtime_seconds);
    }
  }

  private validateUpdateInput(input: CronJobUpdate, existing: CronJobRow): void {
    if (input.task_key !== undefined) {
      this.assertNonBlank('task_key', input.task_key);
      this.assertTaskKeyRegistered(input.task_key);
    }

    if (input.schedule !== undefined) {
      this.assertNonBlank('schedule', input.schedule);
      this.assertSchedule(input.schedule);
    }

    if (input.name !== undefined) {
      this.assertNonBlank('name', input.name);
    }

    if (input.provider !== undefined) {
      this.assertProvider(input.provider);
    }

    if (input.max_runtime_seconds !== undefined) {
      this.assertMaxRuntime(input.max_runtime_seconds);
    }

    if (input.enabled === true) {
      const taskKey = input.task_key ?? existing.task_key;
      this.assertTaskKeyRegistered(taskKey);
    }
  }

  private assertNonBlank(field: string, value: string): void {
    if (value.trim().length === 0) {
      throw new AppError(`${field} must not be blank`, 400, 'VALIDATION', { field });
    }
  }

  private assertProvider(provider: string): void {
    if (!PROVIDERS.includes(provider as CronJobProvider)) {
      throw new AppError(`provider must be one of: ${PROVIDERS.join(', ')}`, 400, 'VALIDATION', {
        provider,
      });
    }
  }

  private assertSchedule(schedule: string): void {
    if (!cron.validate(schedule)) {
      throw new AppError('schedule is not a valid cron expression', 400, 'VALIDATION', { schedule });
    }
  }

  private assertMaxRuntime(maxRuntimeSeconds: number): void {
    if (!Number.isInteger(maxRuntimeSeconds) || maxRuntimeSeconds <= 0) {
      throw new AppError('max_runtime_seconds must be a positive integer', 400, 'VALIDATION', {
        max_runtime_seconds: maxRuntimeSeconds,
      });
    }
  }

  private assertTaskKeyRegistered(taskKey: string): void {
    if (!this.options.registry.has(taskKey)) {
      throw new AppError(`No handler registered for task_key "${taskKey}"`, 400, 'CRON_JOB_HANDLER_NOT_FOUND', {
        task_key: taskKey,
        registered_task_keys: this.options.registry.keys(),
      });
    }
  }

  private async reconcileScheduler(): Promise<void> {
    try {
      await this.options.scheduler.reconcile();
    } catch (err) {
      log.warn({
        ...formatLogError(err),
        msg: 'Cron scheduler reconciliation failed after mutation',
      });
    }
  }

  private mapRepositoryError(err: unknown, fallbackMessage: string): AppError {
    if (err instanceof AppError) {
      return err;
    }

    if (err instanceof RepositoryError) {
      const cause = err.cause as { code?: string; message?: string } | undefined;

      if (cause?.code === '23505') {
        return new AppError('Cron job key already exists', 409, 'CRON_JOB_KEY_EXISTS', cause);
      }

      if (cause?.code === 'PGRST116') {
        return new AppError('Cron job not found', 404, 'CRON_JOB_NOT_FOUND', cause);
      }

      return new AppError(err.message, 500, 'CRON_JOB_REPOSITORY_ERROR', cause);
    }

    return new AppError(fallbackMessage, 500, 'INTERNAL');
  }
}

export function createCronJobService(options: CronJobServiceOptions): CronJobService {
  return new CronJobService(options);
}
