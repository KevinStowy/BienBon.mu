// =============================================================================
// PrismaReviewRepository — outbound adapter for Review persistence
// =============================================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ReviewRepositoryPort } from '../../ports/review.repository.port';
import type { CreateReviewData, UpdateReviewData } from '../../ports/review.repository.port';
import type { Review } from '../../domain/entities/review.entity';

@Injectable()
export class PrismaReviewRepository extends ReviewRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: string): Promise<Review | null> {
    const record = await this.prisma.review.findUnique({ where: { id } });
    return record ? this.mapToReview(record) : null;
  }

  async findByReservationId(reservationId: string): Promise<Review | null> {
    const record = await this.prisma.review.findUnique({ where: { reservationId } });
    return record ? this.mapToReview(record) : null;
  }

  async findByStoreId(
    storeId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: Review[]; total: number }> {
    const skip = (page - 1) * limit;

    // Reviews are linked to reservations which link to baskets which belong to stores.
    // We query via the basket->store relation.
    const [records, total] = await Promise.all([
      this.prisma.review.findMany({
        where: {
          reservation: {
            basket: {
              storeId,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({
        where: {
          reservation: {
            basket: {
              storeId,
            },
          },
        },
      }),
    ]);

    return { data: records.map((r) => this.mapToReview(r)), total };
  }

  async create(data: CreateReviewData): Promise<Review> {
    const record = await this.prisma.review.create({
      data: {
        reservationId: data.reservationId,
        consumerId: data.consumerId,
        partnerId: data.partnerId,
        rating: data.rating,
        comment: data.comment ?? null,
        editableUntil: data.editableUntil,
      },
    });

    return this.mapToReview(record);
  }

  async update(id: string, data: UpdateReviewData): Promise<Review> {
    const updateData: Record<string, unknown> = {};

    if (data.rating !== undefined) updateData['rating'] = data.rating;
    if ('comment' in data) updateData['comment'] = data.comment;

    const record = await this.prisma.review.update({
      where: { id },
      data: updateData,
    });

    return this.mapToReview(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.review.delete({ where: { id } });
  }

  private mapToReview(record: Record<string, unknown>): Review {
    return {
      id: record['id'] as string,
      reservationId: record['reservationId'] as string,
      consumerId: record['consumerId'] as string,
      partnerId: record['partnerId'] as string,
      rating: record['rating'] as number,
      comment: (record['comment'] as string | null) ?? null,
      editableUntil: record['editableUntil'] as Date,
      createdAt: record['createdAt'] as Date,
      updatedAt: record['updatedAt'] as Date,
    };
  }
}
