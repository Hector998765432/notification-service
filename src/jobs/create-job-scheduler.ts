import { getEnv } from '@/config/env.js';
import { CronJobRepository } from '@/persistence/repositories/index.js';
import { createDefaultJobRegistry, type JobRegistry } from '@/jobs/job-registry.js';
import { JobRunner } from '@/jobs/job-runner.js';
import { DynamicCronScheduler } from '@/jobs/dynamic-cron-scheduler.js';
import { createWorkerId } from '@/jobs/worker-id.js';

export interface CronJobRuntime {
  repository: CronJobRepository;
  registry: JobRegistry;
  runner: JobRunner;
  workerId: string;
  scheduler: DynamicCronScheduler;
}

let cachedRuntime: CronJobRuntime | null = null;

export function createCronJobRuntime(): CronJobRuntime {
  if (cachedRuntime) {
    return cachedRuntime;
  }

  const env = getEnv();
  const repository = new CronJobRepository();
  const registry = createDefaultJobRegistry();
  const workerId = createWorkerId();
  const runner = new JobRunner({
    repository,
    registry,
    workerId,
  });
  const scheduler = new DynamicCronScheduler({
    env,
    repository,
    registry,
    runner,
  });

  cachedRuntime = {
    repository,
    registry,
    runner,
    workerId,
    scheduler,
  };

  return cachedRuntime;
}

export function createDynamicCronScheduler(): DynamicCronScheduler {
  return createCronJobRuntime().scheduler;
}
