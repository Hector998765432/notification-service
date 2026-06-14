import cron, { type ScheduledTask } from 'node-cron';
import { getLogger } from '@/logging/logger.js';
import type { Env } from '@/config/env.js';
import type { CronJobRepository } from '@/persistence/repositories/index.js';
import type { CronJobRow } from '@/types/supabase/index.js';
import type { JobRunner } from '@/jobs/job-runner.js';
import type { JobRegistry } from '@/jobs/job-registry.js';

const log = getLogger('jobs.scheduler');

interface ScheduledJobState {
  fingerprint: string;
  task: ScheduledTask;
}

export interface DynamicCronSchedulerOptions {
  env: Env;
  repository: CronJobRepository;
  registry: JobRegistry;
  runner: JobRunner;
}

export class DynamicCronScheduler {
  private readonly scheduledJobs = new Map<string, ScheduledJobState>();
  private reloadTimer: NodeJS.Timeout | null = null;
  private started = false;

  constructor(private readonly options: DynamicCronSchedulerOptions) {}

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    if (!this.options.env.CRON_SCHEDULER_ENABLED) {
      log.info({ msg: 'Dynamic cron scheduler disabled by environment' });
      return;
    }

    await this.reconcileSafe();
    this.reloadTimer = setInterval(() => {
      void this.reconcileSafe();
    }, this.options.env.CRON_SCHEDULER_RELOAD_INTERVAL_MS);

    log.info({
      reloadIntervalMs: this.options.env.CRON_SCHEDULER_RELOAD_INTERVAL_MS,
      registeredHandlers: this.options.registry.keys(),
      msg: 'Dynamic cron scheduler started',
    });
  }

  async stop(): Promise<void> {
    if (this.reloadTimer) {
      clearInterval(this.reloadTimer);
      this.reloadTimer = null;
    }

    await Promise.all([...this.scheduledJobs.values()].map(({ task }) => task.destroy()));
    this.scheduledJobs.clear();
    this.started = false;
    log.info({ msg: 'Dynamic cron scheduler stopped' });
  }

  async reconcile(): Promise<void> {
    const enabledJobs = await this.options.repository.listEnabled();
    const enabledJobIds = new Set(enabledJobs.map((job) => job.id));

    for (const [jobId, state] of this.scheduledJobs.entries()) {
      if (!enabledJobIds.has(jobId)) {
        await state.task.destroy();
        this.scheduledJobs.delete(jobId);
        log.info({ jobId, msg: 'Cron job unscheduled' });
      }
    }

    for (const job of enabledJobs) {
      await this.scheduleOrReplace(job);
    }
  }

  private async reconcileSafe(): Promise<void> {
    try {
      await this.reconcile();
    } catch (err) {
      log.error({ err, msg: 'Dynamic cron scheduler reconciliation failed' });
    }
  }

  private async scheduleOrReplace(job: CronJobRow): Promise<void> {
    if (!this.options.registry.has(job.task_key)) {
      log.warn({
        jobKey: job.key,
        taskKey: job.task_key,
        msg: 'Cron job enabled but no handler is registered',
      });
      return;
    }

    if (!cron.validate(job.schedule)) {
      log.error({ jobKey: job.key, schedule: job.schedule, msg: 'Invalid cron expression' });
      return;
    }

    const fingerprint = this.fingerprint(job);
    const current = this.scheduledJobs.get(job.id);

    if (current?.fingerprint === fingerprint) {
      return;
    }

    if (current) {
      await current.task.destroy();
    }

    const task = cron.createTask(
      job.schedule,
      () => {
        void this.options.runner.run(job.id, 'schedule');
      },
      {
        name: job.key,
        noOverlap: job.no_overlap,
        timezone: job.timezone,
      }
    );

    task.start();
    this.scheduledJobs.set(job.id, { fingerprint, task });

    log.info({
      jobKey: job.key,
      taskKey: job.task_key,
      schedule: job.schedule,
      timezone: job.timezone,
      msg: 'Cron job scheduled',
    });
  }

  private fingerprint(job: CronJobRow): string {
    return JSON.stringify({
      key: job.key,
      taskKey: job.task_key,
      schedule: job.schedule,
      timezone: job.timezone,
      enabled: job.enabled,
      noOverlap: job.no_overlap,
      maxRuntimeSeconds: job.max_runtime_seconds,
      config: job.config,
      updatedAt: job.updated_at,
    });
  }
}
