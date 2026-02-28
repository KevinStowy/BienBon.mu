import { Injectable } from '@nestjs/common';
import { Prisma, BasketStatus as PrismaBasketStatus } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { BasketRepositoryPort, BasketFilters, BasketPagination, PaginatedBaskets } from '../../ports/basket.repository.port';
import type { Basket } from '../../domain/entities/basket.entity';
import type { BasketStatus } from '../../domain/enums/basket-status.enum';
import { InsufficientStockError } from '../../domain/errors/catalog-errors';

/**
 * Prisma implementation of BasketRepositoryPort.
 * Handles all basket persistence concerns.
 */
@Injectable()
export class PrismaBasketRepository extends BasketRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: string): Promise<Basket | null> {
    const record = await this.prisma.basket.findUnique({
      where: { id },
      include: {
        tags: {
          select: { tagId: true },
        },
      },
    });

    if (!record) return null;
    return this.toEntity(record);
  }

  async findMany(filters: BasketFilters, pagination: BasketPagination): Promise<PaginatedBaskets> {
    const where = this.buildWhereClause(filters);
    const orderBy = this.buildOrderBy(pagination);
    const skip = (pagination.page - 1) * pagination.limit;

    const [records, total] = await this.prisma.$transaction([
      this.prisma.basket.findMany({
        where,
        include: { tags: { select: { tagId: true } } },
        orderBy,
        skip,
        take: pagination.limit,
      }),
      this.prisma.basket.count({ where }),
    ]);

    return {
      baskets: records.map((r) => this.toEntity(r)),
      total,
    };
  }

  async findByStore(storeId: string, pagination: BasketPagination): Promise<PaginatedBaskets> {
    const orderBy = this.buildOrderBy(pagination);
    const skip = (pagination.page - 1) * pagination.limit;

    const [records, total] = await this.prisma.$transaction([
      this.prisma.basket.findMany({
        where: { storeId },
        include: { tags: { select: { tagId: true } } },
        orderBy,
        skip,
        take: pagination.limit,
      }),
      this.prisma.basket.count({ where: { storeId } }),
    ]);

    return {
      baskets: records.map((r) => this.toEntity(r)),
      total,
    };
  }

  async create(data: Omit<Basket, 'id' | 'createdAt' | 'updatedAt'>): Promise<Basket> {
    const { tagIds, ...basketData } = data;

    const record = await this.prisma.basket.create({
      data: {
        storeId: basketData.storeId,
        templateId: basketData.templateId ?? null,
        title: basketData.title,
        description: basketData.description ?? null,
        originalPrice: new Prisma.Decimal(basketData.originalPrice),
        sellingPrice: new Prisma.Decimal(basketData.sellingPrice),
        quantity: basketData.quantity,
        stock: basketData.stock,
        categoryId: basketData.categoryId,
        photoUrl: basketData.photoUrl ?? null,
        pickupStart: basketData.pickupStart,
        pickupEnd: basketData.pickupEnd,
        status: basketData.status as unknown as PrismaBasketStatus,
        ...(tagIds && tagIds.length > 0
          ? {
              tags: {
                create: tagIds.map((tagId) => ({ tagId })),
              },
            }
          : {}),
      },
      include: { tags: { select: { tagId: true } } },
    });

    return this.toEntity(record);
  }

  async update(
    id: string,
    data: Partial<Omit<Basket, 'id' | 'storeId' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Basket> {
    const { tagIds, ...basketData } = data;

    const updateData: Record<string, unknown> = {};

    if (basketData.title !== undefined) updateData['title'] = basketData.title;
    if (basketData.description !== undefined) updateData['description'] = basketData.description ?? null;
    if (basketData.originalPrice !== undefined) updateData['originalPrice'] = new Prisma.Decimal(basketData.originalPrice);
    if (basketData.sellingPrice !== undefined) updateData['sellingPrice'] = new Prisma.Decimal(basketData.sellingPrice);
    if (basketData.quantity !== undefined) updateData['quantity'] = basketData.quantity;
    if (basketData.stock !== undefined) updateData['stock'] = basketData.stock;
    if (basketData.categoryId !== undefined) updateData['categoryId'] = basketData.categoryId;
    if (basketData.photoUrl !== undefined) updateData['photoUrl'] = basketData.photoUrl ?? null;
    if (basketData.pickupStart !== undefined) updateData['pickupStart'] = basketData.pickupStart;
    if (basketData.pickupEnd !== undefined) updateData['pickupEnd'] = basketData.pickupEnd;
    if (basketData.status !== undefined) updateData['status'] = basketData.status as unknown as PrismaBasketStatus;

    // Handle tags update: delete all existing then recreate
    if (tagIds !== undefined) {
      await this.prisma.basketTag.deleteMany({ where: { basketId: id } });
      if (tagIds.length > 0) {
        await this.prisma.basketTag.createMany({
          data: tagIds.map((tagId) => ({ basketId: id, tagId })),
        });
      }
    }

    const record = await this.prisma.basket.update({
      where: { id },
      data: updateData,
      include: { tags: { select: { tagId: true } } },
    });

    return this.toEntity(record);
  }

  async updateStatus(id: string, status: BasketStatus): Promise<Basket> {
    const record = await this.prisma.basket.update({
      where: { id },
      data: { status: status as unknown as PrismaBasketStatus },
      include: { tags: { select: { tagId: true } } },
    });
    return this.toEntity(record);
  }

  /**
   * Atomically decrements stock using a raw SQL conditional UPDATE.
   * Returns the remaining stock, or null if there was insufficient stock.
   *
   * ADR-008: Stock must be decremented atomically to prevent overselling.
   */
  async atomicDecrementStock(id: string, quantity: number): Promise<number | null> {
    type RawRow = { stock: number }[];

    const result = await this.prisma.$queryRaw<RawRow>`
      UPDATE baskets
      SET stock = stock - ${quantity}
      WHERE id = ${id}::uuid
        AND stock >= ${quantity}
      RETURNING stock
    `;

    if (result.length === 0) {
      return null;
    }

    return Number(result[0]!.stock);
  }

  /**
   * Increments stock (e.g., on reservation cancellation).
   */
  async incrementStock(id: string, quantity: number): Promise<number> {
    type RawRow = { stock: number }[];

    const result = await this.prisma.$queryRaw<RawRow>`
      UPDATE baskets
      SET stock = stock + ${quantity}
      WHERE id = ${id}::uuid
      RETURNING stock
    `;

    if (result.length === 0) {
      throw new InsufficientStockError(0, quantity);
    }

    return Number(result[0]!.stock);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.basket.delete({ where: { id } });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private buildWhereClause(filters: BasketFilters): Prisma.BasketWhereInput {
    const where: Prisma.BasketWhereInput = {};

    if (filters.status) {
      where.status = filters.status as unknown as PrismaBasketStatus;
    } else {
      where.status = PrismaBasketStatus.PUBLISHED;
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.storeId) {
      where.storeId = filters.storeId;
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.sellingPrice = {};
      if (filters.minPrice !== undefined) {
        (where.sellingPrice as Prisma.DecimalFilter).gte = new Prisma.Decimal(filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        (where.sellingPrice as Prisma.DecimalFilter).lte = new Prisma.Decimal(filters.maxPrice);
      }
    }

    if (filters.pickupAfter !== undefined || filters.pickupBefore !== undefined) {
      if (filters.pickupAfter !== undefined) {
        where.pickupStart = { gte: filters.pickupAfter };
      }
      if (filters.pickupBefore !== undefined) {
        where.pickupEnd = { lte: filters.pickupBefore };
      }
    }

    if (filters.tagIds && filters.tagIds.length > 0) {
      where.tags = {
        some: {
          tagId: { in: filters.tagIds },
        },
      };
    }

    return where;
  }

  private buildOrderBy(pagination: BasketPagination): Prisma.BasketOrderByWithRelationInput {
    const sortOrder = pagination.sortOrder ?? 'asc';

    switch (pagination.sortBy) {
      case 'selling_price':
        return { sellingPrice: sortOrder };
      case 'pickup_start':
        return { pickupStart: sortOrder };
      case 'created_at':
        return { createdAt: sortOrder };
      default:
        return { createdAt: 'desc' };
    }
  }

  private toEntity(
    record: {
      id: string;
      storeId: string;
      templateId: string | null;
      title: string;
      description: string | null;
      originalPrice: Prisma.Decimal;
      sellingPrice: Prisma.Decimal;
      quantity: number;
      stock: number;
      categoryId: string;
      photoUrl: string | null;
      pickupStart: Date;
      pickupEnd: Date;
      status: string;
      createdAt: Date;
      updatedAt: Date;
      tags?: { tagId: string }[];
    },
  ): Basket {
    return {
      id: record.id,
      storeId: record.storeId,
      templateId: record.templateId ?? undefined,
      title: record.title,
      description: record.description ?? undefined,
      originalPrice: Number(record.originalPrice),
      sellingPrice: Number(record.sellingPrice),
      quantity: record.quantity,
      stock: record.stock,
      categoryId: record.categoryId,
      photoUrl: record.photoUrl ?? undefined,
      pickupStart: record.pickupStart,
      pickupEnd: record.pickupEnd,
      status: record.status as BasketStatus,
      tagIds: record.tags?.map((t) => t.tagId) ?? [],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
