import type { SupabaseAdminClient } from '@/db/supabase/index.js';
import { getSupabaseAdminClient } from '@/db/supabase/index.js';
import type {
  TemplateClassificationInsert,
  TemplateClassificationRow,
  TemplateClassificationUpdate,
} from '@/types/supabase/index.js';
import type { PaginatedResult } from '@/persistence/repositories/cron-job.repository.js';
import { RepositoryError } from '@/persistence/repositories/repository-error.js';

export interface ListTemplateClassificationsInput {
  limit: number;
  offset: number;
}

export class TemplateClassificationRepository {
  constructor(private readonly client: SupabaseAdminClient = getSupabaseAdminClient()) {}

  async findById(id: string): Promise<TemplateClassificationRow | null> {
    const { data, error } = await this.client
      .from('template_classifications')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new RepositoryError(`Unable to load template classification ${id}`, error);
    }

    return data;
  }

  async findByName(name: string): Promise<TemplateClassificationRow | null> {
    const { data, error } = await this.client
      .from('template_classifications')
      .select('*')
      .eq('name', name)
      .maybeSingle();

    if (error) {
      throw new RepositoryError(`Unable to load template classification ${name}`, error);
    }

    return data;
  }

  async listPaginated(
    input: ListTemplateClassificationsInput,
  ): Promise<PaginatedResult<TemplateClassificationRow>> {
    const from = input.offset;
    const to = input.offset + input.limit - 1;

    const { data, error, count } = await this.client
      .from('template_classifications')
      .select('*', { count: 'exact' })
      .order('name', { ascending: true })
      .range(from, to);

    if (error) {
      throw new RepositoryError('Unable to list template classifications', error);
    }

    return {
      items: data ?? [],
      pagination: {
        limit: input.limit,
        offset: input.offset,
        total: count ?? 0,
      },
    };
  }

  async countTemplatesByClassification(classificationId: string): Promise<number> {
    const { count, error } = await this.client
      .from('notification_templates')
      .select('*', { count: 'exact', head: true })
      .eq('classification_id', classificationId);

    if (error) {
      throw new RepositoryError(
        `Unable to count templates for classification ${classificationId}`,
        error,
      );
    }

    return count ?? 0;
  }

  async create(input: TemplateClassificationInsert): Promise<TemplateClassificationRow> {
    const { data, error } = await this.client
      .from('template_classifications')
      .insert(input)
      .select('*')
      .single();

    if (error) {
      throw new RepositoryError('Unable to create template classification', error);
    }

    return data;
  }

  async update(id: string, input: TemplateClassificationUpdate): Promise<TemplateClassificationRow> {
    const { data, error } = await this.client
      .from('template_classifications')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new RepositoryError(`Unable to update template classification ${id}`, error);
    }

    return data;
  }

  async delete(id: string): Promise<TemplateClassificationRow | null> {
    const { data, error } = await this.client
      .from('template_classifications')
      .delete()
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      throw new RepositoryError(`Unable to delete template classification ${id}`, error);
    }

    return data;
  }
}
