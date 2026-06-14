import { z } from 'zod';
import type { Json } from '@/types/supabase/index.js';

const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonSchema),
    z.record(z.string(), jsonSchema),
  ])
);

const paginationLimitSchema = z.coerce.number().int().min(1).max(100).default(20);
const paginationOffsetSchema = z.coerce.number().int().min(0).default(0);

const cronJobProviderSchema = z.enum(['odoo', 'supabase', 'internal']);

export const cronJobIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listCronJobsQuerySchema = z.object({
  limit: paginationLimitSchema,
  offset: paginationOffsetSchema,
  enabled: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
});

export const listCronJobRunsQuerySchema = z.object({
  limit: paginationLimitSchema,
  offset: paginationOffsetSchema,
});

export const createCronJobBodySchema = z.object({
  key: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  provider: cronJobProviderSchema,
  task_key: z.string().trim().min(1),
  schedule: z.string().trim().min(1),
  timezone: z.string().trim().min(1).optional(),
  enabled: z.boolean().optional(),
  no_overlap: z.boolean().optional(),
  max_runtime_seconds: z.number().int().positive().optional(),
  config: jsonSchema.optional(),
});

export const updateCronJobBodySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().nullable().optional(),
    provider: cronJobProviderSchema.optional(),
    task_key: z.string().trim().min(1).optional(),
    schedule: z.string().trim().min(1).optional(),
    timezone: z.string().trim().min(1).optional(),
    enabled: z.boolean().optional(),
    no_overlap: z.boolean().optional(),
    max_runtime_seconds: z.number().int().positive().optional(),
    config: jsonSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export type CreateCronJobBody = z.infer<typeof createCronJobBodySchema>;
export type UpdateCronJobBody = z.infer<typeof updateCronJobBodySchema>;
