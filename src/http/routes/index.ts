import { Router } from 'express';
import { cronJobRouter } from '@/http/routes/cron-job.routes.js';
import { notificationRouter } from '@/http/routes/notification.routes.js';
import { notificationTemplateRouter } from '@/http/routes/notification-template.routes.js';
import { templateClassificationRouter } from '@/http/routes/template-classification.routes.js';

export function createApiRouter(): Router {
  const router = Router();
  router.use('/cron-jobs', cronJobRouter);
  router.use('/notifications', notificationRouter);
  router.use('/template-classifications', templateClassificationRouter);
  router.use('/notification-templates', notificationTemplateRouter);
  return router;
}
