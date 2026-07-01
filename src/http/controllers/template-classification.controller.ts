import type { Request, Response } from 'express';
import { AppError } from '@/errors/AppError.js';
import { getTemplateClassificationService } from '@/bootstrap/create-services.js';
import {
  createTemplateClassificationBodySchema,
  listTemplateClassificationsQuerySchema,
  templateClassificationIdParamsSchema,
  updateTemplateClassificationBodySchema,
} from '@/http/validators/template-classification.validator.js';
import { okResponse } from '@/http/utils/response.js';

function parseParams(req: Request) {
  const parsed = templateClassificationIdParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new AppError('Invalid template classification id', 400, 'VALIDATION', parsed.error.flatten());
  }
  return parsed.data;
}

export function createTemplateClassificationController() {
  const service = getTemplateClassificationService();

  return {
    async list(req: Request, res: Response): Promise<void> {
      const parsed = listTemplateClassificationsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new AppError('Invalid query parameters', 400, 'VALIDATION', parsed.error.flatten());
      }

      const result = await service.list(parsed.data);
      res.status(200).json(okResponse(req.requestId, 'TEMPLATE_CLASSIFICATIONS_LISTED', result));
    },

    async getById(req: Request, res: Response): Promise<void> {
      const { id } = parseParams(req);
      const row = await service.getById(id);
      res.status(200).json(okResponse(req.requestId, 'TEMPLATE_CLASSIFICATION_FOUND', row));
    },

    async create(req: Request, res: Response): Promise<void> {
      const parsed = createTemplateClassificationBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError('Invalid template classification payload', 400, 'VALIDATION', parsed.error.flatten());
      }

      const row = await service.create(parsed.data);
      res.status(201).json(okResponse(req.requestId, 'TEMPLATE_CLASSIFICATION_CREATED', row));
    },

    async update(req: Request, res: Response): Promise<void> {
      const { id } = parseParams(req);
      const parsed = updateTemplateClassificationBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(
          'Invalid template classification update payload',
          400,
          'VALIDATION',
          parsed.error.flatten(),
        );
      }

      const row = await service.update(id, parsed.data);
      res.status(200).json(okResponse(req.requestId, 'TEMPLATE_CLASSIFICATION_UPDATED', row));
    },

    async remove(req: Request, res: Response): Promise<void> {
      const { id } = parseParams(req);
      const row = await service.delete(id);
      res.status(200).json(okResponse(req.requestId, 'TEMPLATE_CLASSIFICATION_DELETED', row));
    },
  };
}
