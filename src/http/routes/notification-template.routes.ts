import { Router } from 'express';
import { createNotificationTemplateController } from '@/http/controllers/notification-template.controller.js';
import { asyncHandler } from '@/utils/async-handler.js';

const controller = createNotificationTemplateController();

export const notificationTemplateRouter = Router();

notificationTemplateRouter.get('/', asyncHandler(controller.list.bind(controller)));
notificationTemplateRouter.post('/', asyncHandler(controller.create.bind(controller)));
notificationTemplateRouter.get('/:id', asyncHandler(controller.getById.bind(controller)));
notificationTemplateRouter.patch('/:id', asyncHandler(controller.update.bind(controller)));
notificationTemplateRouter.delete('/:id', asyncHandler(controller.remove.bind(controller)));
