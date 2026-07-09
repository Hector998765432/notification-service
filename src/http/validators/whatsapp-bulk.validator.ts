import { z } from 'zod';

// Accepts E.164 (+5215512345678) with an optional `whatsapp:` prefix.
const whatsAppRecipientSchema = z
  .string()
  .regex(/^(whatsapp:)?\+[1-9]\d{1,14}$/, 'Recipient must be E.164, e.g. +5215512345678');

const whatsAppBulkItemSchema = z.object({
  to: z.array(whatsAppRecipientSchema).min(1),
  template: z.string().min(1),
  templateVars: z.record(z.string(), z.unknown()).optional(),
});

export const whatsAppBulkBodySchema = z.object({
  messages: z.array(whatsAppBulkItemSchema).min(1),
});

export type WhatsAppBulkBody = z.infer<typeof whatsAppBulkBodySchema>;
