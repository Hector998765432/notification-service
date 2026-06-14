import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getEnv, type Env } from '@/config/env.js';
import type { Database } from '@/types/supabase/database.types.js';

export type SupabaseAdminClient = SupabaseClient<Database>;

let cachedAdminClient: SupabaseAdminClient | null = null;

export function createSupabaseAdminClient(env: Env = getEnv()): SupabaseAdminClient {
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function getSupabaseAdminClient(): SupabaseAdminClient {
  if (!cachedAdminClient) {
    cachedAdminClient = createSupabaseAdminClient();
  }

  return cachedAdminClient;
}
