import type { Tag } from '../domain/entities/tag.entity';

/**
 * Outbound port for tag persistence.
 */
export abstract class TagRepositoryPort {
  abstract findAll(onlyActive?: boolean): Promise<Tag[]>;
  abstract findById(id: string): Promise<Tag | null>;
  abstract findByIds(ids: string[]): Promise<Tag[]>;
}
