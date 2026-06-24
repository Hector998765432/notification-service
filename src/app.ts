import express from 'express';
import { apiKeyMiddleware } from '@/http/middlewares/api-key.js';
import { errorHandler } from '@/http/middlewares/error-handler.js';
import { requestIdMiddleware } from '@/http/middlewares/request-id.js';
import { createApiRouter } from '@/http/routes/index.js';
import { healthRouter } from '@/http/routes/health.routes.js';
import { webhookRouter } from '@/http/routes/webhook.routes.js';
import { failResponse } from '@/http/utils/response.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', true);
  app.use(requestIdMiddleware);
  app.use('/webhooks', webhookRouter);

  app.use(express.json());
  app.use(apiKeyMiddleware);
  app.use(healthRouter);
  app.use(createApiRouter());
  app.use((req, res) => {
    res.status(404).json(failResponse(req.requestId, 'NOT_FOUND', 'Not found'));
  });
  app.use(errorHandler);

  return app;
}
