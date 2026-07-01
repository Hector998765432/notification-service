import type { Request, Response } from 'express';
import { AppError } from '@/errors/AppError.js';
import { getNotificationTemplateService } from '@/bootstrap/create-services.js';
import {
  createNotificationTemplateBodySchema,
  listNotificationTemplatesQuerySchema,
  notificationTemplateIdParamsSchema,
  updateNotificationTemplateBodySchema,
} from '@/http/validators/notification-template.validator.js';
import { okResponse } from '@/http/utils/response.js';

function parseParams(req: Request) {
  const parsed = notificationTemplateIdParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new AppError('Invalid notification template id', 400, 'VALIDATION', parsed.error.flatten());
  }
  return parsed.data;
}

export function createNotificationTemplateController() {
  const service = getNotificationTemplateService();

  return {
    async list(req: Request, res: Response): Promise<void> {
      const parsed = listNotificationTemplatesQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new AppError('Invalid query parameters', 400, 'VALIDATION', parsed.error.flatten());
      }

      const result = await service.list(parsed.data);
      res.status(200).json(okResponse(req.requestId, 'NOTIFICATION_TEMPLATES_LISTED', result));
    },

    async getById(req: Request, res: Response): Promise<void> {
      const { id } = parseParams(req);
      const row = await service.getById(id);
      res.status(200).json(okResponse(req.requestId, 'NOTIFICATION_TEMPLATE_FOUND', row));
    },

    async create(req: Request, res: Response): Promise<void> {
      const parsed = createNotificationTemplateBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError('Invalid notification template payload', 400, 'VALIDATION', parsed.error.flatten());
      }

      const row = await service.create(parsed.data);
      res.status(201).json(okResponse(req.requestId, 'NOTIFICATION_TEMPLATE_CREATED', row));
    },

    async update(req: Request, res: Response): Promise<void> {
      const { id } = parseParams(req);
      const parsed = updateNotificationTemplateBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(
          'Invalid notification template update payload',
          400,
          'VALIDATION',
          parsed.error.flatten(),
        );
      }

      const row = await service.update(id, parsed.data);
      res.status(200).json(okResponse(req.requestId, 'NOTIFICATION_TEMPLATE_UPDATED', row));
    },

    async remove(req: Request, res: Response): Promise<void> {
      const { id } = parseParams(req);
      const row = await service.delete(id);
      res.status(200).json(okResponse(req.requestId, 'NOTIFICATION_TEMPLATE_DELETED', row));
    },
  };
}
