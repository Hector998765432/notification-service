import { AppError } from '@/errors/AppError.js';
import type { NotificationTemplateRepository } from '@/persistence/repositories/notification-template.repository.js';
import type { TemplateClassificationRepository } from '@/persistence/repositories/template-classification.repository.js';
import { RepositoryError } from '@/persistence/repositories/repository-error.js';
import type {
  NotificationTemplateChannel,
  NotificationTemplateInsert,
  NotificationTemplateRow,
  NotificationTemplateUpdate,
} from '@/types/supabase/index.js';
import { applyTemplate } from '@/utils/template.js';

const TEMPLATE_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CONTENT_SID_RE = /^HX[a-f0-9]+$/i;

export interface NotificationTemplateListInput {
  limit: number;
  offset: number;
  channel?: NotificationTemplateChannel;
  classificationId?: string;
  isActive?: boolean;
}

export interface ResolvedEmailTemplate {
  html: string;
  defaultSubject: string;
}

export interface ResolvedWhatsAppTemplate {
  contentSid: string;
  contentVariables: Record<string, string>;
  correlationValue?: string;
}

export class NotificationTemplateService {
  constructor(
    private readonly templateRepository: NotificationTemplateRepository,
    private readonly classificationRepository: TemplateClassificationRepository,
  ) {}

  async list(input: NotificationTemplateListInput) {
    return this.templateRepository.listPaginated(input);
  }

  async getById(id: string): Promise<NotificationTemplateRow> {
    const row = await this.templateRepository.findById(id);
    if (!row) {
      throw new AppError(`Notification template ${id} not found`, 404, 'NOTIFICATION_TEMPLATE_NOT_FOUND');
    }
    return row;
  }

  async create(input: NotificationTemplateInsert): Promise<NotificationTemplateRow> {
    await this.assertClassificationExists(input.classification_id);
    this.validateTemplateName(input.name);
    this.validateChannelFields(input.channel, input);

    try {
      return await this.templateRepository.create(this.normalizeInsert(input));
    } catch (err) {
      throw this.mapRepositoryError(err, 'Unable to create notification template');
    }
  }

  async update(id: string, input: NotificationTemplateUpdate): Promise<NotificationTemplateRow> {
    const existing = await this.getById(id);

    if (input.classification_id !== undefined) {
      await this.assertClassificationExists(input.classification_id);
    }

    if (input.name !== undefined) {
      this.validateTemplateName(input.name);
    }

    if (input.channel !== undefined && input.channel !== existing.channel) {
      throw new AppError('Cannot change template channel', 400, 'VALIDATION');
    }

    const merged = this.mergeForValidation(existing, input);
    this.validateChannelFields(existing.channel, merged);

    try {
      const update = this.normalizeUpdate(input);
      return await this.templateRepository.update(id, update);
    } catch (err) {
      throw this.mapRepositoryError(err, `Unable to update notification template ${id}`);
    }
  }

  async delete(id: string): Promise<NotificationTemplateRow> {
    await this.getById(id);

    try {
      const deleted = await this.templateRepository.delete(id);
      if (!deleted) {
        throw new AppError(`Notification template ${id} not found`, 404, 'NOTIFICATION_TEMPLATE_NOT_FOUND');
      }
      return deleted;
    } catch (err) {
      if (err instanceof AppError) {
        throw err;
      }
      throw this.mapRepositoryError(err, `Unable to delete notification template ${id}`);
    }
  }

  async resolveEmailTemplate(
    name: string,
    templateVars: Record<string, unknown>,
  ): Promise<ResolvedEmailTemplate> {
    const row = await this.loadActiveTemplate(name, 'email');

    if (!row.html_body || !row.default_subject) {
      throw new Error(`Email template "${name}" is missing html_body or default_subject`);
    }

    const normalizedVars = this.normalizeTemplateVars(templateVars);
    const html = applyTemplate(row.html_body, normalizedVars);

    return {
      html,
      defaultSubject: row.default_subject,
    };
  }

  async resolveWhatsAppTemplate(
    name: string,
    templateVars: Record<string, unknown>,
  ): Promise<ResolvedWhatsAppTemplate> {
    const row = await this.loadActiveTemplate(name, 'whatsapp');

    if (!row.content_sid) {
      throw new Error(`WhatsApp template "${name}" is missing content_sid`);
    }

    const variables = this.parseVariables(row.variables);
    const contentVariables: Record<string, string> = {};

    variables.forEach((variableName, index) => {
      const value = templateVars[variableName];
      if (value === null || value === undefined) {
        throw new Error(`Missing template variable "${variableName}" for WhatsApp template "${name}"`);
      }
      contentVariables[String(index + 1)] = String(value);
    });

    let correlationValue: string | undefined;
    if (row.correlation_var) {
      const value = templateVars[row.correlation_var];
      if (value !== null && value !== undefined && value !== '') {
        correlationValue = String(value);
      }
    }

    return {
      contentSid: row.content_sid,
      contentVariables,
      correlationValue,
    };
  }

  private async loadActiveTemplate(
    name: string,
    channel: NotificationTemplateChannel,
  ): Promise<NotificationTemplateRow> {
    const row = await this.templateRepository.findByNameAndChannel(name, channel);
    if (!row) {
      throw new Error(`Unknown ${channel} template: ${name}`);
    }
    if (!row.is_active) {
      throw new Error(`${channel} template "${name}" is inactive`);
    }
    return row;
  }

  private async assertClassificationExists(classificationId: string): Promise<void> {
    const classification = await this.classificationRepository.findById(classificationId);
    if (!classification) {
      throw new AppError(
        `Template classification ${classificationId} not found`,
        400,
        'TEMPLATE_CLASSIFICATION_NOT_FOUND',
      );
    }
  }

  private validateTemplateName(name: string): void {
    const trimmed = name.trim();
    if (!TEMPLATE_NAME_RE.test(trimmed)) {
      throw new AppError(
        'Template name must be kebab-case (e.g. crash-alert)',
        400,
        'VALIDATION',
        { name },
      );
    }
  }

  private validateChannelFields(
    channel: NotificationTemplateChannel,
    fields: {
      html_body?: string | null;
      default_subject?: string | null;
      content_sid?: string | null;
      variables?: unknown;
      correlation_var?: string | null;
    },
  ): void {
    if (channel === 'email') {
      if (!fields.html_body?.trim()) {
        throw new AppError('html_body is required for email templates', 400, 'VALIDATION');
      }
      if (!fields.default_subject?.trim()) {
        throw new AppError('default_subject is required for email templates', 400, 'VALIDATION');
      }
      if (fields.content_sid || fields.variables || fields.correlation_var) {
        throw new AppError('WhatsApp fields are not allowed on email templates', 400, 'VALIDATION');
      }
      return;
    }

    if (!fields.content_sid?.trim()) {
      throw new AppError('content_sid is required for WhatsApp templates', 400, 'VALIDATION');
    }
    if (!CONTENT_SID_RE.test(fields.content_sid.trim())) {
      throw new AppError('content_sid must be a Twilio Content SID (HX...)', 400, 'VALIDATION');
    }

    const variables = this.parseVariables(fields.variables);
    if (variables.length === 0) {
      throw new AppError('variables must be a non-empty array for WhatsApp templates', 400, 'VALIDATION');
    }

    if (fields.correlation_var && !variables.includes(fields.correlation_var)) {
      throw new AppError('correlation_var must be one of the template variables', 400, 'VALIDATION');
    }

    if (fields.html_body || fields.default_subject) {
      throw new AppError('Email fields are not allowed on WhatsApp templates', 400, 'VALIDATION');
    }
  }

  private parseVariables(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  }

  private mergeForValidation(
    existing: NotificationTemplateRow,
    input: NotificationTemplateUpdate,
  ): NotificationTemplateInsert {
    return {
      classification_id: input.classification_id ?? existing.classification_id,
      name: input.name ?? existing.name,
      channel: existing.channel,
      is_active: input.is_active ?? existing.is_active,
      html_body: input.html_body !== undefined ? input.html_body : existing.html_body,
      default_subject: input.default_subject !== undefined ? input.default_subject : existing.default_subject,
      content_sid: input.content_sid !== undefined ? input.content_sid : existing.content_sid,
      variables: input.variables !== undefined ? input.variables : existing.variables,
      correlation_var: input.correlation_var !== undefined ? input.correlation_var : existing.correlation_var,
    };
  }

  private normalizeInsert(input: NotificationTemplateInsert): NotificationTemplateInsert {
    const normalized: NotificationTemplateInsert = {
      ...input,
      name: input.name.trim(),
      is_active: input.is_active ?? true,
    };

    if (input.channel === 'email') {
      normalized.html_body = input.html_body?.trim() ?? null;
      normalized.default_subject = input.default_subject?.trim() ?? null;
      normalized.content_sid = null;
      normalized.variables = null;
      normalized.correlation_var = null;
    } else {
      normalized.content_sid = input.content_sid?.trim() ?? null;
      normalized.variables = this.parseVariables(input.variables);
      normalized.correlation_var = input.correlation_var?.trim() || null;
      normalized.html_body = null;
      normalized.default_subject = null;
    }

    return normalized;
  }

  private normalizeUpdate(input: NotificationTemplateUpdate): NotificationTemplateUpdate {
    const normalized: NotificationTemplateUpdate = { ...input };

    if (normalized.name !== undefined) {
      normalized.name = normalized.name.trim();
    }
    if (normalized.html_body !== undefined) {
      normalized.html_body = normalized.html_body?.trim() ?? null;
    }
    if (normalized.default_subject !== undefined) {
      normalized.default_subject = normalized.default_subject?.trim() ?? null;
    }
    if (normalized.content_sid !== undefined) {
      normalized.content_sid = normalized.content_sid?.trim() ?? null;
    }
    if (normalized.variables !== undefined) {
      normalized.variables = this.parseVariables(normalized.variables);
    }
    if (normalized.correlation_var !== undefined) {
      normalized.correlation_var = normalized.correlation_var?.trim() || null;
    }

    return normalized;
  }

  private normalizeTemplateVars(
    vars: Record<string, unknown>,
  ): Record<string, string | number | null | undefined> {
    const normalized: Record<string, string | number | null | undefined> = {};

    for (const [key, value] of Object.entries(vars)) {
      if (value === null || value === undefined) {
        normalized[key] = value;
      } else if (typeof value === 'string' || typeof value === 'number') {
        normalized[key] = value;
      } else {
        normalized[key] = JSON.stringify(value);
      }
    }

    return normalized;
  }

  private mapRepositoryError(err: unknown, fallbackMessage: string): AppError {
    if (err instanceof AppError) {
      return err;
    }

    if (err instanceof RepositoryError) {
      const cause = err.cause as { code?: string; message?: string } | undefined;

      if (cause?.code === '23505') {
        return new AppError(
          'Template name already exists for this channel',
          409,
          'NOTIFICATION_TEMPLATE_NAME_EXISTS',
          cause,
        );
      }

      if (cause?.code === '23503') {
        return new AppError('Template classification not found', 400, 'TEMPLATE_CLASSIFICATION_NOT_FOUND', cause);
      }

      return new AppError(err.message, 500, 'NOTIFICATION_TEMPLATE_REPOSITORY_ERROR', cause);
    }

    return new AppError(fallbackMessage, 500, 'INTERNAL');
  }
}

export function createNotificationTemplateService(
  templateRepository: NotificationTemplateRepository,
  classificationRepository: TemplateClassificationRepository,
): NotificationTemplateService {
  return new NotificationTemplateService(templateRepository, classificationRepository);
}
