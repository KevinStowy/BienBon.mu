import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotFoundError } from '../../shared/errors/domain-error';
import { PaginatedResponseDto, PaginationQueryDto } from '../../shared/dto/pagination.dto';
import type { FavoriteResponseDto } from './dto/favorite-response.dto';

/**
 * Service handling consumer favorites (stores marked as favorites).
 *
 * Toggle semantics: adding an already-favorited store is a no-op (idempotent).
 */
@Injectable()
export class FavoriteService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all favorite stores for the authenticated user, paginated.
   */
  async listFavorites(userId: string, pagination: PaginationQueryDto): Promise<PaginatedResponseDto<FavoriteResponseDto>> {
    const skip = (pagination.page - 1) * pagination.limit;

    const [records, total] = await this.prisma.$transaction([
      this.prisma.favorite.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pagination.limit,
      }),
      this.prisma.favorite.count({ where: { userId } }),
    ]);

    return PaginatedResponseDto.create(
      records.map((r) => this.toResponseDto(r)),
      total,
      pagination,
    );
  }

  /**
   * Add a store to favorites.
   * Idempotent: if the store is already in favorites, the existing entry is returned.
   */
  async addFavorite(userId: string, storeId: string): Promise<FavoriteResponseDto> {
    // Verify the store exists
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundError('STORE_NOT_FOUND', `Store ${storeId} not found`);
    }

    // Check for existing favorite (idempotent)
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_storeId: { userId, storeId } },
    });

    if (existing) {
      return this.toResponseDto(existing);
    }

    const created = await this.prisma.favorite.create({
      data: { userId, storeId },
    });

    return this.toResponseDto(created);
  }

  /**
   * Remove a store from favorites.
   * Throws NotFoundError if the favorite does not exist.
   */
  async removeFavorite(userId: string, storeId: string): Promise<void> {
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_storeId: { userId, storeId } },
    });

    if (!existing) {
      throw new NotFoundError('FAVORITE_NOT_FOUND', `Store ${storeId} is not in favorites`);
    }

    await this.prisma.favorite.delete({
      where: { userId_storeId: { userId, storeId } },
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private toResponseDto(record: {
    id: string;
    userId: string;
    storeId: string;
    createdAt: Date;
  }): FavoriteResponseDto {
    return {
      id: record.id,
      userId: record.userId,
      storeId: record.storeId,
      createdAt: record.createdAt,
    };
  }
}
