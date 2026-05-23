import { Router } from 'express';
import { notificationRouter } from '@/http/routes/notification.routes.js';

export function createApiRouter(): Router {
  const router = Router();
  router.use('/notifications', notificationRouter);
  return router;
}
