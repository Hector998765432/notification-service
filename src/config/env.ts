import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';
import path from 'node:path';

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'local']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  ENVIRONMENT: z.enum(['development', 'production', 'local']).default('development'),
  SERVICE_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().email(),
  EMAIL_PROVIDER: z.enum(['resend']).default('resend'),
  CRASH_ALERT_EMAIL: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  SUPABASE_STORAGE_URL: z.string().url().optional(),
  ODOO_URL: z.string().url(),
  ODOO_DB: z.string().min(1),
  ODOO_USER: z.string().min(1),
  ODOO_PASSWORD: z.string().min(1),
  CRON_SCHEDULER_ENABLED: z.coerce.boolean().default(false),
  CRON_SCHEDULER_RELOAD_INTERVAL_MS: z.coerce.number().int().positive().default(60_000),
});

export type Env = z.infer<typeof schema>;
let cached: Env | null = null;

export function loadEnv(): Env {
  loadDotenv({ path: path.resolve(process.cwd(), '.env') });
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment: ${msg}`);
  }
  cached = parsed.data;
  return cached;
}

export function getEnv(): Env {
  if (!cached) {
    return loadEnv();
  }
  return cached;
}