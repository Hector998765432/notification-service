export type DatabaseProviderName = 'supabase';

export interface DatabaseHealthCheck {
  provider: DatabaseProviderName;
  ok: boolean;
  error?: string;
}

export interface DatabaseProvider<TClient> {
  readonly name: DatabaseProviderName;
  getClient(): TClient;
  healthCheck(): Promise<DatabaseHealthCheck>;
}
