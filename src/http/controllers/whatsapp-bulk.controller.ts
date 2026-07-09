import type { Request, Response } from 'express';
import { AppError } from '@/errors/AppError.js';
import { getWhatsAppBulkSendService } from '@/bootstrap/create-services.js';
import { whatsAppBulkBodySchema } from '@/http/validators/whatsapp-bulk.validator.js';
import { okResponse } from '@/http/utils/response.js';
import type { WhatsAppBulkMessageItem } from '@/whatsapp/types.js';

export function createWhatsAppBulkController() {
  const bulkService = getWhatsAppBulkSendService();

  return {
    async send(req: Request, res: Response): Promise<void> {
      const parsed = whatsAppBulkBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError('Invalid bulk WhatsApp payload', 400, 'VALIDATION', parsed.error.flatten());
      }

      const items: WhatsAppBulkMessageItem[] = parsed.data.messages.flatMap((message) =>
        message.to.map((to) => ({
          to,
          template: message.template,
          templateVars: message.templateVars,
        })),
      );

      const result = await bulkService.sendBulk(items);

      res.status(200).json(okResponse(req.requestId, 'WHATSAPP_BULK_SENT', result));
    },
  };
}
