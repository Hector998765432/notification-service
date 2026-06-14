import { getSupabaseAdminClient, type SupabaseAdminClient } from '@/db/supabase/admin.js';
import type { DatabaseHealthCheck, DatabaseProvider } from '@/db/providers/index.js';

export class SupabaseProvider implements DatabaseProvider<SupabaseAdminClient> {
  readonly name = 'supabase' as const;

  constructor(private readonly client: SupabaseAdminClient = getSupabaseAdminClient()) {}

  getClient(): SupabaseAdminClient {
    return this.client;
  }

  async healthCheck(): Promise<DatabaseHealthCheck> {
    const { error } = await this.client.from('roles').select('id').limit(1);

    if (error) {
      return {
        provider: this.name,
        ok: false,
        error: error.message,
      };
    }

    return {
      provider: this.name,
      ok: true,
    };
  }
}

let cachedProvider: SupabaseProvider | null = null;

export function getSupabaseProvider(): SupabaseProvider {
  if (!cachedProvider) {
    cachedProvider = new SupabaseProvider();
  }

  return cachedProvider;
}
