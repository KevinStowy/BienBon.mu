import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { TagRepositoryPort } from '../../ports/tag.repository.port';
import type { Tag } from '../../domain/entities/tag.entity';

/**
 * Prisma implementation of TagRepositoryPort.
 */
@Injectable()
export class PrismaTagRepository extends TagRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findAll(onlyActive = true): Promise<Tag[]> {
    const records = await this.prisma.tag.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: { namesFr: 'asc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  async findById(id: string): Promise<Tag | null> {
    const record = await this.prisma.tag.findUnique({ where: { id } });
    if (!record) return null;
    return this.toEntity(record);
  }

  async findByIds(ids: string[]): Promise<Tag[]> {
    if (ids.length === 0) return [];
    const records = await this.prisma.tag.findMany({
      where: { id: { in: ids } },
    });
    return records.map((r) => this.toEntity(r));
  }

  private toEntity(record: {
    id: string;
    slug: string;
    namesFr: string;
    namesEn: string | null;
    namesKr: string | null;
    icon: string | null;
    description: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): Tag {
    return {
      id: record.id,
      slug: record.slug,
      namesFr: record.namesFr,
      namesEn: record.namesEn ?? undefined,
      namesKr: record.namesKr ?? undefined,
      icon: record.icon ?? undefined,
      description: record.description ?? undefined,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
