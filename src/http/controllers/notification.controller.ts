import type { Request, Response } from 'express';
import { AppError } from '@/errors/AppError.js';
import { getNotificationService } from '@/bootstrap/create-services.js';
import { notificationBodySchema } from '@/http/validators/notification.validator.js';
import { okResponse } from '@/http/utils/response.js';

export function createNotificationController() {
  const notificationService = getNotificationService();

  return {
    async send(req: Request, res: Response): Promise<void> {
      const parsed = notificationBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError('Invalid notification payload', 400, 'VALIDATION', parsed.error.flatten());
      }

      const result = await notificationService.send(parsed.data);

      if (!result.allSucceeded) {
        throw new AppError('One or more notification channels failed', 502, 'NOTIFICATION_FAILED', result);
      }

      res.status(200).json(okResponse(req.requestId, 'NOTIFICATION_SENT', result));
    },
  };
}
