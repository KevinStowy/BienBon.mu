import { Injectable } from '@nestjs/common';
import { CategoryRepositoryPort } from '../../ports/category.repository.port';
import { TagRepositoryPort } from '../../ports/tag.repository.port';
import type { Category } from '../../domain/entities/category.entity';
import type { Tag } from '../../domain/entities/tag.entity';

/**
 * Category and Tag application service.
 * Simple read-only service since categories and tags are managed by admins.
 */
@Injectable()
export class CategoryService {
  constructor(
    private readonly categoryRepo: CategoryRepositoryPort,
    private readonly tagRepo: TagRepositoryPort,
  ) {}

  async listCategories(): Promise<Category[]> {
    return this.categoryRepo.findAll(true);
  }

  async listTags(): Promise<Tag[]> {
    return this.tagRepo.findAll(true);
  }
}
