import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { CategoryRepositoryPort } from '../../ports/category.repository.port';
import type { Category } from '../../domain/entities/category.entity';

/**
 * Prisma implementation of CategoryRepositoryPort.
 */
@Injectable()
export class PrismaCategoryRepository extends CategoryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findAll(onlyActive = true): Promise<Category[]> {
    const records = await this.prisma.category.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: { namesFr: 'asc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  async findById(id: string): Promise<Category | null> {
    const record = await this.prisma.category.findUnique({ where: { id } });
    if (!record) return null;
    return this.toEntity(record);
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const record = await this.prisma.category.findUnique({ where: { slug } });
    if (!record) return null;
    return this.toEntity(record);
  }

  private toEntity(record: {
    id: string;
    slug: string;
    namesFr: string;
    namesEn: string | null;
    namesKr: string | null;
    icon: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): Category {
    return {
      id: record.id,
      slug: record.slug,
      namesFr: record.namesFr,
      namesEn: record.namesEn ?? undefined,
      namesKr: record.namesKr ?? undefined,
      icon: record.icon ?? undefined,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
