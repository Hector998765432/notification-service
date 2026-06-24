import express, { Router } from 'express';
import { createTwilioWebhookController } from '@/http/controllers/twilio-webhook.controller.js';
import { twilioSignatureMiddleware } from '@/http/middlewares/twilio-signature.js';

const controller = createTwilioWebhookController();

export const webhookRouter = Router();

// Twilio posts application/x-www-form-urlencoded; parse it for this router only.
webhookRouter.use(express.urlencoded({ extended: false }));

webhookRouter.post(
  '/twilio/whatsapp',
  twilioSignatureMiddleware,
  controller.whatsappInbound.bind(controller),
);
