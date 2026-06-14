import { getLogger } from '@/logging/logger.js';
import type { CronJobHandler } from '@/types/jobs/index.js';

const log = getLogger('jobs.handlers.notification');
export const notificationHandler: CronJobHandler = async ({
  job,
  config,
  runId,
  workerId,
  triggeredBy,
  signal,
}) => {
  if (signal.aborted) {
    log.warn({ jobKey: job.key, runId, msg: 'Notification handler aborted before start' });
    return;
  }

  log.info({
    jobKey: job.key,
    taskKey: job.task_key,
    runId,
    workerId,
    triggeredBy,
    schedule: job.schedule,
    config,
    msg: 'Notification handler started',
  });

  await new Promise((resolve) => setTimeout(resolve, 250));

  log.info({
    jobKey: job.key,
    runId,
    msg: 'Notification handler finished',
  });

  return {
    metadata: {
      tested_at: new Date().toISOString(),
      job_key: job.key,
      run_id: runId,
    },
  };
};
