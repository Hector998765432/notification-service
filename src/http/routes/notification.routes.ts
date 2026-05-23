import { Router } from 'express';
import { createNotificationController } from '@/http/controllers/notification.controller.js';
import { failResponse } from '@/http/utils/response.js';
import { asyncHandler } from '@/utils/async-handler.js';

const controller = createNotificationController();

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
