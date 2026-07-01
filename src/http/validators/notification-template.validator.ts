import { z } from 'zod';

const paginationLimitSchema = z.coerce.number().int().min(1).max(100).default(20);
const paginationOffsetSchema = z.coerce.number().int().min(0).default(0);

const templateChannelSchema = z.enum(['email', 'whatsapp']);

export const notificationTemplateIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listNotificationTemplatesQuerySchema = z.object({
  limit: paginationLimitSchema,
  offset: paginationOffsetSchema,
  channel: templateChannelSchema.optional(),
  classificationId: z.string().uuid().optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
});

const emailTemplateFieldsSchema = z.object({
  html_body: z.string().min(1),
  default_subject: z.string().min(1),
});

const whatsAppTemplateFieldsSchema = z.object({
  content_sid: z.string().trim().min(1),
  variables: z.array(z.string().trim().min(1)).min(1),
  correlation_var: z.string().trim().min(1).optional(),
});

export const createNotificationTemplateBodySchema = z
  .object({
    classification_id: z.string().uuid(),
    name: z.string().trim().min(1),
    channel: templateChannelSchema,
    is_active: z.boolean().optional(),
    html_body: z.string().min(1).optional(),
    default_subject: z.string().min(1).optional(),
    content_sid: z.string().trim().min(1).optional(),
    variables: z.array(z.string().trim().min(1)).min(1).optional(),
    correlation_var: z.string().trim().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.channel === 'email') {
      const result = emailTemplateFieldsSchema.safeParse(data);
      if (!result.success) {
        for (const issue of result.error.issues) {
          ctx.addIssue({ ...issue, path: issue.path });
        }
      }
      if (data.content_sid || data.variables || data.correlation_var) {
        ctx.addIssue({
          code: 'custom',
          message: 'WhatsApp fields are not allowed on email templates',
          path: ['channel'],
        });
      }
    }

    if (data.channel === 'whatsapp') {
      const result = whatsAppTemplateFieldsSchema.safeParse(data);
      if (!result.success) {
        for (const issue of result.error.issues) {
          ctx.addIssue({ ...issue, path: issue.path });
        }
      }
      if (data.html_body || data.default_subject) {
        ctx.addIssue({
          code: 'custom',
          message: 'Email fields are not allowed on WhatsApp templates',
          path: ['channel'],
        });
      }
      if (data.correlation_var && data.variables && !data.variables.includes(data.correlation_var)) {
        ctx.addIssue({
          code: 'custom',
          message: 'correlation_var must be one of the template variables',
          path: ['correlation_var'],
        });
      }
    }
  });

export const updateNotificationTemplateBodySchema = z
  .object({
    classification_id: z.string().uuid().optional(),
    name: z.string().trim().min(1).optional(),
    is_active: z.boolean().optional(),
    html_body: z.string().min(1).optional(),
    default_subject: z.string().min(1).optional(),
    content_sid: z.string().trim().min(1).optional(),
    variables: z.array(z.string().trim().min(1)).min(1).optional(),
    correlation_var: z.string().trim().min(1).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export type CreateNotificationTemplateBody = z.infer<typeof createNotificationTemplateBodySchema>;
export type UpdateNotificationTemplateBody = z.infer<typeof updateNotificationTemplateBodySchema>;
