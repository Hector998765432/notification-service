import type { SupabaseAdminClient } from '@/db/supabase/index.js';
import { getSupabaseAdminClient } from '@/db/supabase/index.js';
import type { CompanyInsert, CompanyRow, CompanyUpdate } from '@/types/supabase/index.js';
import type { ReadRepository, WriteRepository } from '@/persistence/repositories/base.repository.js';
import { RepositoryError } from '@/persistence/repositories/repository-error.js';

export class CompaniesRepository
  implements ReadRepository<string, CompanyRow>, WriteRepository<CompanyInsert, CompanyUpdate, CompanyRow>
{
  constructor(private readonly client: SupabaseAdminClient = getSupabaseAdminClient()) {}

  async findById(id: string): Promise<CompanyRow | null> {
    const { data, error } = await this.client.from('companies').select('*').eq('id', id).maybeSingle();

    if (error) {
      throw new RepositoryError(`Unable to load company ${id}`, error);
    }

    return data;
  }

  async findByOdooPartnerId(odooPartnerId: number): Promise<CompanyRow | null> {
    const { data, error } = await this.client
      .from('companies')
      .select('*')
      .eq('odoo_partner_id', odooPartnerId)
      .maybeSingle();

    if (error) {
      throw new RepositoryError(`Unable to load company by Odoo partner ${odooPartnerId}`, error);
    }

    return data;
  }

  async create(input: CompanyInsert): Promise<CompanyRow> {
    const { data, error } = await this.client.from('companies').insert(input).select('*').single();

    if (error) {
      throw new RepositoryError('Unable to create company', error);
    }

    return data;
  }

  async update(id: string, input: CompanyUpdate): Promise<CompanyRow> {
    const { data, error } = await this.client
      .from('companies')
      .update(input)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new RepositoryError(`Unable to update company ${id}`, error);
    }

    return data;
  }
}
