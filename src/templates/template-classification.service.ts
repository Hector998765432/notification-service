import { AppError } from '@/errors/AppError.js';
import type { TemplateClassificationRepository } from '@/persistence/repositories/template-classification.repository.js';
import { RepositoryError } from '@/persistence/repositories/repository-error.js';
import type {
  TemplateClassificationInsert,
  TemplateClassificationRow,
  TemplateClassificationUpdate,
} from '@/types/supabase/index.js';

export interface TemplateClassificationListInput {
  limit: number;
  offset: number;
}

export class TemplateClassificationService {
  constructor(private readonly repository: TemplateClassificationRepository) {}

  async list(input: TemplateClassificationListInput) {
    return this.repository.listPaginated(input);
  }

  async getById(id: string): Promise<TemplateClassificationRow> {
    const row = await this.repository.findById(id);
    if (!row) {
      throw new AppError(`Template classification ${id} not found`, 404, 'TEMPLATE_CLASSIFICATION_NOT_FOUND');
    }
    return row;
  }

  async create(input: TemplateClassificationInsert): Promise<TemplateClassificationRow> {
    this.validateName(input.name);

    try {
      return await this.repository.create({ name: input.name.trim() });
    } catch (err) {
      throw this.mapRepositoryError(err, 'Unable to create template classification');
    }
  }

  async update(id: string, input: TemplateClassificationUpdate): Promise<TemplateClassificationRow> {
    await this.getById(id);

    if (input.name !== undefined) {
      this.validateName(input.name);
    }

    try {
      const update: TemplateClassificationUpdate = { ...input };
      if (update.name !== undefined) {
        update.name = update.name.trim();
      }
      return await this.repository.update(id, update);
    } catch (err) {
      throw this.mapRepositoryError(err, `Unable to update template classification ${id}`);
    }
  }

  async delete(id: string): Promise<TemplateClassificationRow> {
    await this.getById(id);

    const templateCount = await this.repository.countTemplatesByClassification(id);
    if (templateCount > 0) {
      throw new AppError(
        'Cannot delete classification while templates reference it',
        409,
        'CLASSIFICATION_IN_USE',
        { templateCount },
      );
    }

    try {
      const deleted = await this.repository.delete(id);
      if (!deleted) {
        throw new AppError(`Template classification ${id} not found`, 404, 'TEMPLATE_CLASSIFICATION_NOT_FOUND');
      }
      return deleted;
    } catch (err) {
      if (err instanceof AppError) {
        throw err;
      }
      throw this.mapRepositoryError(err, `Unable to delete template classification ${id}`);
    }
  }

  private validateName(name: string): void {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new AppError('Classification name is required', 400, 'VALIDATION');
    }
  }

  private mapRepositoryError(err: unknown, fallbackMessage: string): AppError {
    if (err instanceof AppError) {
      return err;
    }

    if (err instanceof RepositoryError) {
      const cause = err.cause as { code?: string; message?: string } | undefined;

      if (cause?.code === '23505') {
        return new AppError('Classification name already exists', 409, 'TEMPLATE_CLASSIFICATION_NAME_EXISTS', cause);
      }

      if (cause?.code === '23503') {
        return new AppError('Classification is referenced by templates', 409, 'CLASSIFICATION_IN_USE', cause);
      }

      return new AppError(err.message, 500, 'TEMPLATE_CLASSIFICATION_REPOSITORY_ERROR', cause);
    }

    return new AppError(fallbackMessage, 500, 'INTERNAL');
  }
}

export function createTemplateClassificationService(
  repository: TemplateClassificationRepository,
): TemplateClassificationService {
  return new TemplateClassificationService(repository);
}
