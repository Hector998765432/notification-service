import { Router } from 'express';
import { createCronJobController } from '@/http/controllers/cron-job.controller.js';
import { asyncHandler } from '@/utils/async-handler.js';

const controller = createCronJobController();

export const cronJobRouter = Router();

cronJobRouter.get('/', asyncHandler(controller.list.bind(controller)));
cronJobRouter.post('/', asyncHandler(controller.create.bind(controller)));
cronJobRouter.get('/:id', asyncHandler(controller.getById.bind(controller)));
cronJobRouter.patch('/:id', asyncHandler(controller.update.bind(controller)));
cronJobRouter.delete('/:id', asyncHandler(controller.remove.bind(controller)));
cronJobRouter.post('/:id/pause', asyncHandler(controller.pause.bind(controller)));
cronJobRouter.post('/:id/resume', asyncHandler(controller.resume.bind(controller)));
cronJobRouter.post('/:id/run', asyncHandler(controller.run.bind(controller)));
cronJobRouter.get('/:id/runs', asyncHandler(controller.listRuns.bind(controller)));
