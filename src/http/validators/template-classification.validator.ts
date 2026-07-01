import { z } from 'zod';

const paginationLimitSchema = z.coerce.number().int().min(1).max(100).default(20);
const paginationOffsetSchema = z.coerce.number().int().min(0).default(0);

export const templateClassificationIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listTemplateClassificationsQuerySchema = z.object({
  limit: paginationLimitSchema,
  offset: paginationOffsetSchema,
});

export const createTemplateClassificationBodySchema = z.object({
  name: z.string().trim().min(1),
});

export const updateTemplateClassificationBodySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export type CreateTemplateClassificationBody = z.infer<typeof createTemplateClassificationBodySchema>;
export type UpdateTemplateClassificationBody = z.infer<typeof updateTemplateClassificationBodySchema>;
