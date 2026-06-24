import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { getLogger } from '@/logging/logger.js';
import type { CronJobHandler } from '@/types/jobs/index.js';

type OperatorsFile = {
  operators: Array<{
    name: string;
    phone: string;
    vin: string;
  }>;
};

const operatorsFilePath = path.resolve(process.cwd(), 'tests/dummy.json');

const getOperators = async (): Promise<OperatorsFile> => {
  const raw = await readFile(operatorsFilePath, 'utf8');
  return JSON.parse(raw) as OperatorsFile;
};


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

  const operators = await getOperators();

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

  for (const operator of operators.operators) {
    log.info({
      triggeredBy: operator.name,
      operator,
      msg: `Sending notification to ${operator.name} - ${operator.phone}`,
    });
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

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
