import type { SupabaseAdminClient } from '@/db/supabase/index.js';
import { getSupabaseAdminClient } from '@/db/supabase/index.js';
import type {
  NotificationTemplateChannel,
  NotificationTemplateInsert,
  NotificationTemplateRow,
  NotificationTemplateUpdate,
  NotificationTemplateWithClassification,
} from '@/types/supabase/index.js';

type NotificationTemplateQueryRow = NotificationTemplateRow & {
  template_classifications: {
    name: string;
  } | null;
};
import type { PaginatedResult } from '@/persistence/repositories/cron-job.repository.js';
import { RepositoryError } from '@/persistence/repositories/repository-error.js';

export interface ListNotificationTemplatesInput {
  limit: number;
  offset: number;
  channel?: NotificationTemplateChannel;
  classificationId?: string;
  isActive?: boolean;
}

export class NotificationTemplateRepository {
  constructor(private readonly client: SupabaseAdminClient = getSupabaseAdminClient()) {}

  async findById(id: string): Promise<NotificationTemplateRow | null> {
    const { data, error } = await this.client
      .from('notification_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new RepositoryError(`Unable to load notification template ${id}`, error);
    }

    return data;
  }

  async findByNameAndChannel(
    name: string,
    channel: NotificationTemplateChannel,
    bulk?: boolean,
  ): Promise<NotificationTemplateRow | null> {
    let query = this.client
      .from('notification_templates')
      .select('*')
      .eq('name', name)
      .eq('channel', channel);

    if (bulk !== undefined) {
      query = query.eq('bulk', bulk);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new RepositoryError(`Unable to load notification template ${name} (${channel})`, error);
    }

    return data;
  }

  async findAll(): Promise<NotificationTemplateWithClassification[]> {
    const { data, error } = await this.client
      .from('notification_templates')
      .select(`
        *,
        template_classifications ( name )
      `);

    if (error) {
      throw new RepositoryError('Unable to load notification templates', error);
    }

    return (data as unknown as NotificationTemplateQueryRow[]).map(
      ({ template_classifications, ...template }) => ({
        ...template,
        classificationName: template_classifications?.name ?? '',
      }),
    );
  }

  async listPaginated(
    input: ListNotificationTemplatesInput,
  ): Promise<PaginatedResult<NotificationTemplateRow>> {
    const from = input.offset;
    const to = input.offset + input.limit - 1;

    let query = this.client
      .from('notification_templates')
      .select('*,template_classifications ( name )', { count: 'exact' })
      .order('name', { ascending: true })
      .order('created_at', { ascending: false });

    if (input.channel !== undefined) {
      query = query.eq('channel', input.channel);
    }

    if (input.classificationId !== undefined) {
      query = query.eq('classification_id', input.classificationId);
    }

    if (input.isActive !== undefined) {
      query = query.eq('is_active', input.isActive);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      throw new RepositoryError('Unable to list notification templates', error);
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

  async create(input: NotificationTemplateInsert): Promise<NotificationTemplateRow> {
    const { data, error } = await this.client
      .from('notification_templates')
      .insert(input)
      .select('*')
      .single();

    if (error) {
      throw new RepositoryError('Unable to create notification template', error);
    }

    return data;
  }

  async update(id: string, input: NotificationTemplateUpdate): Promise<NotificationTemplateRow> {
    const { data, error } = await this.client
      .from('notification_templates')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new RepositoryError(`Unable to update notification template ${id}`, error);
    }

    return data;
  }

  async delete(id: string): Promise<NotificationTemplateRow | null> {
    const { data, error } = await this.client
      .from('notification_templates')
      .delete()
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      throw new RepositoryError(`Unable to delete notification template ${id}`, error);
    }

    return data;
  }
}
