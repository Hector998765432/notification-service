import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getEnv, type Env } from '@/config/env.js';
import type { Database } from '@/types/supabase/database.types.js';

export type SupabaseBackendClient = SupabaseClient<Database>;

export function createSupabaseClient(env: Env = getEnv()): SupabaseBackendClient {
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
