import { getSupabaseAdminClient } from '@/db/supabase/admin.js';

export interface SupabaseHealthCheckResult {
  provider: 'supabase';
  ok: boolean;
  error?: string;
}

export async function checkSupabaseConnection(): Promise<SupabaseHealthCheckResult> {
  const { error } = await getSupabaseAdminClient().from('roles').select('id').limit(1);

  if (error) {
    return {
      provider: 'supabase',
      ok: false,
      error: error.message,
    };
  }

  return {
    provider: 'supabase',
    ok: true,
  };
}
