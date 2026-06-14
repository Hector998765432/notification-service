import type { Request, Response } from 'express';
import { AppError } from '@/errors/AppError.js';
import { getCronJobService } from '@/bootstrap/create-services.js';
import {
  createCronJobBodySchema,
  cronJobIdParamsSchema,
  listCronJobRunsQuerySchema,
  listCronJobsQuerySchema,
  updateCronJobBodySchema,
} from '@/http/validators/cron-job.validator.js';
import { okResponse } from '@/http/utils/response.js';

function parseParams(req: Request) {
  const parsed = cronJobIdParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new AppError('Invalid cron job id', 400, 'VALIDATION', parsed.error.flatten());
  }
  return parsed.data;
}

export function createCronJobController() {
  const cronJobService = getCronJobService();

  return {
    async list(req: Request, res: Response): Promise<void> {
      const parsed = listCronJobsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new AppError('Invalid query parameters', 400, 'VALIDATION', parsed.error.flatten());
      }

      const result = await cronJobService.list(parsed.data);
      res.status(200).json(okResponse(req.requestId, 'CRON_JOBS_LISTED', result));
    },

    async getById(req: Request, res: Response): Promise<void> {
      const { id } = parseParams(req);
      const job = await cronJobService.getById(id);
      res.status(200).json(okResponse(req.requestId, 'CRON_JOB_FOUND', job));
    },

    async create(req: Request, res: Response): Promise<void> {
      const parsed = createCronJobBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError('Invalid cron job payload', 400, 'VALIDATION', parsed.error.flatten());
      }

      const job = await cronJobService.create(parsed.data);
      res.status(201).json(okResponse(req.requestId, 'CRON_JOB_CREATED', job));
    },

    async update(req: Request, res: Response): Promise<void> {
      const { id } = parseParams(req);
      const parsed = updateCronJobBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError('Invalid cron job update payload', 400, 'VALIDATION', parsed.error.flatten());
      }

      const job = await cronJobService.update(id, parsed.data);
      res.status(200).json(okResponse(req.requestId, 'CRON_JOB_UPDATED', job));
    },

    async remove(req: Request, res: Response): Promise<void> {
      const { id } = parseParams(req);
      const job = await cronJobService.delete(id);
      res.status(200).json(okResponse(req.requestId, 'CRON_JOB_DELETED', job));
    },

    async pause(req: Request, res: Response): Promise<void> {
      const { id } = parseParams(req);
      const job = await cronJobService.pause(id);
      res.status(200).json(okResponse(req.requestId, 'CRON_JOB_PAUSED', job));
    },

    async resume(req: Request, res: Response): Promise<void> {
      const { id } = parseParams(req);
      const job = await cronJobService.resume(id);
      res.status(200).json(okResponse(req.requestId, 'CRON_JOB_RESUMED', job));
    },

    async run(req: Request, res: Response): Promise<void> {
      const { id } = parseParams(req);
      const result = await cronJobService.run(id);
      res.status(200).json(okResponse(req.requestId, 'CRON_JOB_RUN_COMPLETED', result));
    },

    async listRuns(req: Request, res: Response): Promise<void> {
      const { id } = parseParams(req);
      const parsed = listCronJobRunsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new AppError('Invalid query parameters', 400, 'VALIDATION', parsed.error.flatten());
      }

      const result = await cronJobService.listRuns({
        jobId: id,
        ...parsed.data,
      });
      res.status(200).json(okResponse(req.requestId, 'CRON_JOB_RUNS_LISTED', result));
    },
  };
}
