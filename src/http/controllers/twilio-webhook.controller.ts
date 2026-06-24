import type { Request, Response } from 'express';
import { getEnv } from '@/config/env.js';
import { getLogger } from '@/logging/logger.js';
import {
  getWhatsAppContextRepository,
  getWhatsAppProvider,
} from '@/bootstrap/create-services.js';
import { ContractReviewService } from '@/whatsapp/inbound/contract-review.service.js';

const log = getLogger('http.twilio-webhook');

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

export function createTwilioWebhookController(
  contractReviewService: ContractReviewService = new ContractReviewService(
    getWhatsAppProvider(),
    getWhatsAppContextRepository(),
  ),
) {
  return {
    /**
     * Twilio inbound WhatsApp webhook. Replies 200 with empty TwiML immediately
     * (avoids Twilio's ~15s timeout and retries) and processes the reply out of
     * band via the REST API.
     */
    whatsappInbound(req: Request, res: Response): void {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const from = typeof body.From === 'string' ? body.From : '';
      const messageBody = typeof body.Body === 'string' ? body.Body : '';
      const messageSid = typeof body.MessageSid === 'string' ? body.MessageSid : undefined;

      const keyword = getEnv().WHATSAPP_REVISAR_KEYWORD.trim().toUpperCase();
      const normalizedBody = messageBody.trim().toUpperCase();
      const isRevisar = normalizedBody === keyword;

      log.info({
        from,
        messageSid,
        body: messageBody,
        matchedKeyword: isRevisar,
        msg: 'Twilio inbound WhatsApp message received',
      });

      res.type('text/xml').status(200).send(EMPTY_TWIML);

      if (!isRevisar || !from) {
        return;
      }

      void contractReviewService.handleRevisar(from).catch((err: unknown) => {
        log.error({
          from,
          messageSid,
          err: err instanceof Error ? err.message : String(err),
          msg: 'Failed to process REVISAR reply',
        });
      });
    },
  };
}
