import { Router } from 'express';
import { cronJobRouter } from '@/http/routes/cron-job.routes.js';
import { notificationRouter } from '@/http/routes/notification.routes.js';

export function createApiRouter(): Router {
  const router = Router();
  router.use('/cron-jobs', cronJobRouter);
  router.use('/notifications', notificationRouter);
  return router;
}
