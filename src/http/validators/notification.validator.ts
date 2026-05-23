import { z } from 'zod';

const emailTemplateSchema = z.enum(['crash-alert']);

export const notificationBodySchema = z
  .object({
    channels: z.array(z.enum(['email'])).min(1),
    email: z
      .object({
        to: z.array(z.string().email()).min(1),
        subject: z.string().min(1).optional(),
        html: z.string().min(1).optional(),
        text: z.string().optional(),
        template: emailTemplateSchema.optional(),
        templateVars: z.record(z.string(), z.unknown()).optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.channels.includes('email') && !data.email) {
      ctx.addIssue({
        code: 'custom',
        message: 'email configuration is required when email channel is selected',
        path: ['email'],
      });
      return;
    }

    if (!data.email) {
      return;
    }

    const hasHtml = Boolean(data.email.html);
    const hasTemplate = Boolean(data.email.template);

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

    if (hasHtml && !data.email.subject) {
      ctx.addIssue({
        code: 'custom',
        message: 'email subject is required when html is provided',
        path: ['email', 'subject'],
      });
    }
  });

export type NotificationBody = z.infer<typeof notificationBodySchema>;
