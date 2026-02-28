import type { Category } from '../domain/entities/category.entity';

/**
 * Outbound port for category persistence.
 */
export abstract class CategoryRepositoryPort {
  abstract findAll(onlyActive?: boolean): Promise<Category[]>;
  abstract findById(id: string): Promise<Category | null>;
  abstract findBySlug(slug: string): Promise<Category | null>;
}
