import { formatLogError } from '@/logging/format-log-error.js';
import { getLogger } from '@/logging/logger.js';
import type { CronJobRepository } from '@/persistence/repositories/index.js';
import type { Json } from '@/types/supabase/index.js';
import type { CronJobRunStatus, CronJobTrigger } from '@/types/jobs/index.js';
import type { JobRegistry } from '@/jobs/job-registry.js';

const log = getLogger('jobs.runner');

class JobTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Cron job exceeded ${timeoutMs}ms timeout`);
    this.name = 'JobTimeoutError';
  }
}

export interface JobRunnerOptions {
  repository: CronJobRepository;
  registry: JobRegistry;
  workerId: string;
}

export interface JobRunResult {
  status: CronJobRunStatus;
  runId?: string;
}

export class JobRunner {
  constructor(private readonly options: JobRunnerOptions) {}

  async run(jobId: string, triggeredBy: CronJobTrigger = 'schedule'): Promise<JobRunResult> {
    const claimedJob = await this.options.repository.claimJob(jobId, this.options.workerId);

    if (!claimedJob?.id) {
      log.debug({ jobId, workerId: this.options.workerId, msg: 'Cron job lease not acquired' });
      return { status: 'skipped' };
    }

    const handler = this.options.registry.get(claimedJob.task_key);
    const run = await this.options.repository.createRun(
      this.options.repository.buildRun(claimedJob, this.options.workerId, triggeredBy)
    );
    const startedAt = Date.now();
    const controller = new AbortController();

    if (!handler) {
      const message = `No handler registered for task_key "${claimedJob.task_key}"`;
      await this.options.repository.completeRun({
        jobId: claimedJob.id,
        runId: run.id,
        workerId: this.options.workerId,
        status: 'failed',
        durationMs: Date.now() - startedAt,
        errorMessage: message,
        metadata: { task_key: claimedJob.task_key },
      });
      log.error({ jobId: claimedJob.id, taskKey: claimedJob.task_key, msg: message });
      return { status: 'failed', runId: run.id };
    }

    try {
      const result = await this.withTimeout(
        handler({
          job: claimedJob,
          config: claimedJob.config,
          runId: run.id,
          workerId: this.options.workerId,
          triggeredBy,
          signal: controller.signal,
        }),
        claimedJob.max_runtime_seconds * 1000,
        controller
      );

      await this.options.repository.completeRun({
        jobId: claimedJob.id,
        runId: run.id,
        workerId: this.options.workerId,
        status: 'success',
        durationMs: Date.now() - startedAt,
        metadata: result?.metadata ?? {},
      });

      log.info({ jobKey: claimedJob.key, runId: run.id, msg: 'Cron job completed' });
      return { status: 'success', runId: run.id };
    } catch (err) {
      const status: Exclude<CronJobRunStatus, 'running'> =
        err instanceof JobTimeoutError ? 'timeout' : 'failed';
      const errorMessage = err instanceof Error ? err.message : String(err);

      await this.options.repository.completeRun({
        jobId: claimedJob.id,
        runId: run.id,
        workerId: this.options.workerId,
        status,
        durationMs: Date.now() - startedAt,
        errorMessage,
        metadata: formatLogError(err) as Json,
      });

      log.error({
        ...formatLogError(err),
        jobKey: claimedJob.key,
        runId: run.id,
        status,
        msg: 'Cron job failed',
      });
      return { status, runId: run.id };
    }
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    controller: AbortController
  ): Promise<T> {
    let timeout: NodeJS.Timeout | undefined;

    try {
      return await Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => {
            controller.abort();
            reject(new JobTimeoutError(timeoutMs));
          }, timeoutMs);
        }),
      ]);
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }
}
