import { Router } from 'express';
import { createNotificationController } from '@/http/controllers/notification.controller.js';
import { createWhatsAppBulkController } from '@/http/controllers/whatsapp-bulk.controller.js';
import { failResponse } from '@/http/utils/response.js';
import { asyncHandler } from '@/utils/async-handler.js';

const controller = createNotificationController();
const whatsAppBulkController = createWhatsAppBulkController();

export const notificationRouter = Router();

notificationRouter.get('/', (req, res) => {
  res
    .status(405)
    .json(
      failResponse(
        req.requestId,
        'METHOD_NOT_ALLOWED',
        'Use POST /notifications with a JSON body to send notifications',
      ),
    );
});

notificationRouter.post('/', asyncHandler(controller.send.bind(controller)));

notificationRouter.post(
  '/whatsapp/bulk',
  asyncHandler(whatsAppBulkController.send.bind(whatsAppBulkController)),
);
