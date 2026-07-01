import { z } from 'zod';

// Accepts E.164 (+5215512345678) with an optional `whatsapp:` prefix.
const whatsAppRecipientSchema = z
  .string()
  .regex(/^(whatsapp:)?\+[1-9]\d{1,14}$/, 'Recipient must be E.164, e.g. +5215512345678');

const emailConfigSchema = z.object({
  to: z.array(z.string().email()).min(1),
  subject: z.string().min(1).optional(),
  html: z.string().min(1).optional(),
  text: z.string().optional(),
  template: z.string().min(1).optional(),
  templateVars: z.record(z.string(), z.unknown()).optional(),
});

const whatsAppConfigSchema = z.object({
  to: z.array(whatsAppRecipientSchema).min(1),
  template: z.string().min(1),
  templateVars: z.record(z.string(), z.unknown()).optional(),
});

export const notificationBodySchema = z
  .object({
    channels: z.array(z.enum(['email', 'whatsapp'])).min(1),
    email: emailConfigSchema.optional(),
    whatsapp: whatsAppConfigSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.channels.includes('email')) {
      validateEmail(data.email, ctx);
    }

    if (data.channels.includes('whatsapp') && !data.whatsapp) {
      ctx.addIssue({
        code: 'custom',
        message: 'whatsapp configuration is required when whatsapp channel is selected',
        path: ['whatsapp'],
      });
    }
  });

function validateEmail(
  email: z.infer<typeof emailConfigSchema> | undefined,
  ctx: z.RefinementCtx,
): void {
  if (!email) {
    ctx.addIssue({
      code: 'custom',
      message: 'email configuration is required when email channel is selected',
      path: ['email'],
    });
    return;
  }

  const hasHtml = Boolean(email.html);
  const hasTemplate = Boolean(email.template);

  if (!hasHtml && !hasTemplate) {
    ctx.addIssue({
      code: 'custom',
      message: 'email requires either html or template',
      path: ['email'],
    });
  }

  if (hasHtml && hasTemplate) {
    ctx.addIssue({
      code: 'custom',
      message: 'email cannot include both html and template',
      path: ['email'],
    });
  }

  if (hasHtml && !email.subject) {
    ctx.addIssue({
      code: 'custom',
      message: 'email subject is required when html is provided',
      path: ['email', 'subject'],
    });
  }
}

export type NotificationBody = z.infer<typeof notificationBodySchema>;
