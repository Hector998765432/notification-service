import { Router } from 'express';
import { createTemplateClassificationController } from '@/http/controllers/template-classification.controller.js';
import { asyncHandler } from '@/utils/async-handler.js';

const controller = createTemplateClassificationController();

export const templateClassificationRouter = Router();

templateClassificationRouter.get('/', asyncHandler(controller.list.bind(controller)));
templateClassificationRouter.post('/', asyncHandler(controller.create.bind(controller)));
templateClassificationRouter.get('/:id', asyncHandler(controller.getById.bind(controller)));
templateClassificationRouter.patch('/:id', asyncHandler(controller.update.bind(controller)));
templateClassificationRouter.delete('/:id', asyncHandler(controller.remove.bind(controller)));
