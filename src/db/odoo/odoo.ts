import { getEnv, type Env } from '@/config/env.js';

export interface OdooConfig {
  url: string;
  db: string;
  username: string;
  password: string;
}

interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: { message?: string };
  };
}

function configFromEnv(env: Env): OdooConfig {
  return {
    url: env.ODOO_URL,
    db: env.ODOO_DB,
    username: env.ODOO_USER,
    password: env.ODOO_PASSWORD,
  };
}

export class OdooJsonRpcClient {
  private uid: number | null = null;

  constructor(private readonly config: OdooConfig = configFromEnv(getEnv())) {}

  private async jsonRpc<T>(service: string, method: string, args: unknown[]): Promise<T> {
    const res = await fetch(`${this.config.url}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        id: 1,
        params: { service, method, args },
      }),
    });

    const data = (await res.json()) as JsonRpcResponse<T>;

    if (data.error) {
      const message = data.error.data?.message ?? data.error.message ?? JSON.stringify(data.error);
      throw new Error(`Odoo [${service}.${method}]: ${message}`);
    }

    return data.result as T;
  }

  private async authenticate(): Promise<number> {
    if (this.uid) return this.uid;

    const uid = await this.jsonRpc<number>('common', 'authenticate', [
      this.config.db,
      this.config.username,
      this.config.password,
      {},
    ]);

    if (!uid) {
      throw new Error(
        'Odoo: authentication failed. Check ODOO_USER and ODOO_PASSWORD. ' +
          'If your account uses Google/Microsoft SSO, generate an API key from ' +
          'Odoo Settings > Users > [your user] > Account Security > API Keys ' +
          'and set it as ODOO_PASSWORD in your .env file.'
      );
    }

    this.uid = uid;
    return uid;
  }

  /**
   * Calls an Odoo model method via the external JSON-RPC API (`/jsonrpc`).
   *
   * @param model - Odoo technical model name (e.g. `'fleet.vehicle'`)
   * @param method - Model method to invoke (e.g. `'search_read'`)
   * @param args - Positional arguments such as domain filters
   * @param kwargs - Keyword arguments such as `fields`, `limit`, `offset`
   */
  async call<T>(
    model: string,
    method: string,
    args: unknown[] = [],
    kwargs: Record<string, unknown> = {}
  ): Promise<T> {
    const uid = await this.authenticate();

    return this.jsonRpc<T>('object', 'execute_kw', [
      this.config.db,
      uid,
      this.config.password,
      model,
      method,
      args,
      kwargs,
    ]);
  }
}

let cachedOdooClient: OdooJsonRpcClient | null = null;

export function getOdooClient(): OdooJsonRpcClient {
  if (!cachedOdooClient) {
    cachedOdooClient = new OdooJsonRpcClient();
  }

  return cachedOdooClient;
}

/**
 * Calls an Odoo model method via the external JSON-RPC API (`/jsonrpc`).
 *
 * @param model  - Odoo technical model name (e.g. `'fleet.vehicle'`)
 * @param method - Model method to invoke (e.g. `'search_read'`)
 * @param args   - Positional arguments such as domain filters
 * @param kwargs - Keyword arguments such as `fields`, `limit`, `offset`
 *
 * @example
 * const vehicles = await odooCall('fleet.vehicle', 'search_read', [[]], { fields: ['name'], limit: 100 })
 */
export async function odooCall<T>(
  model: string,
  method: string,
  args: unknown[] = [],
  kwargs: Record<string, unknown> = {}
): Promise<T> {
  return getOdooClient().call<T>(model, method, args, kwargs);
}
