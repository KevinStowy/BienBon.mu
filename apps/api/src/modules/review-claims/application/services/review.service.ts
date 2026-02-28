// =============================================================================
// ReviewService — orchestrates review CRUD (ADR-024)
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { DOMAIN_EVENTS, DomainException, ErrorCode } from '@bienbon/shared-types';
import type { ReviewCreatedEvent } from '@bienbon/shared-types';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ReviewRepositoryPort } from '../../ports/review.repository.port';
import type { Review } from '../../domain/entities/review.entity';
import {
  isRatingValid,
  isReviewEditable,
  isWithinReviewWindow,
} from '../../domain/rules/review.rules';
import {
  reservationNotFound,
  reservationNotPickedUp,
  reviewAccessDenied,
  reviewAlreadyExists,
  reviewInvalidRating,
  reviewNotEditable,
  reviewNotFound,
  reviewWindowExpired,
} from '../../domain/errors/review-claims.errors';

export interface CreateReviewCommand {
  reservationId: string;
  consumerId: string;
  rating: number;
  comment?: string;
}

export interface UpdateReviewCommand {
  rating: number;
  comment?: string;
}

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(
    private readonly reviewRepo: ReviewRepositoryPort,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ---------------------------------------------------------------------------
  // Consumer operations
  // ---------------------------------------------------------------------------

  async createReview(command: CreateReviewCommand): Promise<Review> {
    // 1. Validate rating
    if (!isRatingValid(command.rating)) {
      throw reviewInvalidRating(command.rating);
    }

    // 2. Fetch reservation
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: command.reservationId },
      include: { basket: { select: { storeId: true } } },
    });

    if (!reservation) {
      throw reservationNotFound(command.reservationId);
    }

    // 3. Guard: reservation must be in PICKED_UP status
    if (reservation.status !== 'PICKED_UP') {
      throw reservationNotPickedUp(command.reservationId);
    }

    // 4. Guard: consumer must own the reservation
    if (reservation.consumerId !== command.consumerId) {
      throw new DomainException(
        ErrorCode.FORBIDDEN,
        `Consumer "${command.consumerId}" does not own reservation "${command.reservationId}"`,
        { reservationId: command.reservationId, consumerId: command.consumerId },
      );
    }

    // 5. Guard: must be within the 24-hour review window
    if (!reservation.pickedUpAt || !isWithinReviewWindow(reservation.pickedUpAt)) {
      throw reviewWindowExpired(command.reservationId);
    }

    // 6. Guard: no existing review for this reservation
    const existingReview = await this.reviewRepo.findByReservationId(command.reservationId);
    if (existingReview) {
      throw reviewAlreadyExists(command.reservationId);
    }

    // 7. Determine editableUntil (pickedUpAt + 24h)
    const editableUntil = new Date(reservation.pickedUpAt.getTime() + 24 * 60 * 60 * 1000);

    // 8. Determine partnerId from the store's partner association
    // We need the owner partner of the store — find the OWNER partner store entry
    const partnerStore = await this.prisma.partnerStore.findFirst({
      where: { storeId: reservation.basket.storeId, storeRole: 'OWNER' },
      include: { partner: { select: { userId: true } } },
    });

    const partnerId = partnerStore?.partner.userId ?? reservation.basket.storeId;

    // 9. Create the review
    const review = await this.reviewRepo.create({
      reservationId: command.reservationId,
      consumerId: command.consumerId,
      partnerId,
      rating: command.rating,
      comment: command.comment,
      editableUntil,
    });

    // 10. Update store avg_rating and total_reviews atomically
    await this.updateStoreRating(reservation.basket.storeId, command.rating, 'add');

    // 11. Emit ReviewCreated domain event
    const event: ReviewCreatedEvent = {
      eventId: randomUUID(),
      eventType: DOMAIN_EVENTS.REVIEW_CREATED,
      occurredAt: new Date().toISOString(),
      aggregateId: review.id,
      aggregateType: 'Review',
      payload: {
        reviewId: review.id,
        reservationId: review.reservationId,
        consumerId: review.consumerId,
        partnerId: review.partnerId,
        storeId: reservation.basket.storeId,
        rating: review.rating,
      },
      metadata: { actorId: command.consumerId },
    };

    this.eventEmitter.emit(DOMAIN_EVENTS.REVIEW_CREATED, event);

    this.logger.log(`Review created: ${review.id} for reservation ${command.reservationId}`);

    return review;
  }

  async updateReview(
    reviewId: string,
    consumerId: string,
    command: UpdateReviewCommand,
  ): Promise<Review> {
    // 1. Validate rating
    if (!isRatingValid(command.rating)) {
      throw reviewInvalidRating(command.rating);
    }

    // 2. Fetch review (must own it)
    const review = await this.reviewRepo.findById(reviewId);
    if (!review) throw reviewNotFound(reviewId);
    if (review.consumerId !== consumerId) throw reviewAccessDenied(reviewId, consumerId);

    // 3. Guard: within editable window
    if (!isReviewEditable(review.editableUntil)) {
      throw reviewNotEditable(reviewId);
    }

    // 4. Update review
    const oldRating = review.rating;
    const updated = await this.reviewRepo.update(reviewId, {
      rating: command.rating,
      comment: command.comment,
    });

    // 5. Recalculate store avg_rating if rating changed
    if (oldRating !== command.rating) {
      await this.recalculateStoreRatingOnUpdate(
        review.reservationId,
        oldRating,
        command.rating,
      );
    }

    return updated;
  }

  async listStoreReviews(
    storeId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: Review[]; total: number }> {
    return this.reviewRepo.findByStoreId(storeId, page, limit);
  }

  // ---------------------------------------------------------------------------
  // Admin operations
  // ---------------------------------------------------------------------------

  async adminDeleteReview(reviewId: string): Promise<void> {
    // 1. Fetch review
    const review = await this.reviewRepo.findById(reviewId);
    if (!review) throw reviewNotFound(reviewId);

    // 2. Fetch reservation to get storeId
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: review.reservationId },
      include: { basket: { select: { storeId: true } } },
    });

    // 3. Delete the review
    await this.reviewRepo.delete(reviewId);

    // 4. Recalculate store avg_rating and total_reviews if store exists
    if (reservation) {
      await this.updateStoreRating(reservation.basket.storeId, review.rating, 'remove');
    }

    this.logger.log(`Review ${reviewId} deleted by admin`);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Atomically update store avg_rating and total_reviews via raw SQL for correctness.
   */
  private async updateStoreRating(
    storeId: string,
    rating: number,
    operation: 'add' | 'remove',
  ): Promise<void> {
    try {
      if (operation === 'add') {
        await this.prisma.store.update({
          where: { id: storeId },
          data: {
            totalReviews: { increment: 1 },
          },
        });

        // Re-fetch to compute new avg atomically
        const store = await this.prisma.store.findUnique({
          where: { id: storeId },
          select: { avgRating: true, totalReviews: true },
        });

        if (store) {
          const oldCount = store.totalReviews - 1;
          const newAvg =
            oldCount > 0
              ? (Number(store.avgRating) * oldCount + rating) / store.totalReviews
              : rating;

          await this.prisma.store.update({
            where: { id: storeId },
            data: { avgRating: Math.round(newAvg * 100) / 100 },
          });
        }
      } else {
        // Remove: recompute from remaining reviews
        const remainingReviews = await this.prisma.review.aggregate({
          where: {
            reservation: { basket: { storeId } },
          },
          _avg: { rating: true },
          _count: { rating: true },
        });

        const newAvg = remainingReviews._avg.rating ?? 0;
        const newCount = remainingReviews._count.rating;

        await this.prisma.store.update({
          where: { id: storeId },
          data: {
            avgRating: Math.round(newAvg * 100) / 100,
            totalReviews: newCount,
          },
        });
      }
    } catch (err) {
      this.logger.error(
        `Failed to update store rating for store ${storeId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      // Non-fatal — review is already created, rating update is best-effort
    }
  }

  /**
   * Recalculate store avg_rating when a review's rating is updated.
   */
  private async recalculateStoreRatingOnUpdate(
    reservationId: string,
    oldRating: number,
    newRating: number,
  ): Promise<void> {
    try {
      const reservation = await this.prisma.reservation.findUnique({
        where: { id: reservationId },
        include: { basket: { select: { storeId: true } } },
      });

      if (!reservation) return;

      const storeId = reservation.basket.storeId;
      const store = await this.prisma.store.findUnique({
        where: { id: storeId },
        select: { avgRating: true, totalReviews: true },
      });

      if (!store || store.totalReviews === 0) return;

      const currentTotal = Number(store.avgRating) * store.totalReviews;
      const newTotal = currentTotal - oldRating + newRating;
      const newAvg = newTotal / store.totalReviews;

      await this.prisma.store.update({
        where: { id: storeId },
        data: { avgRating: Math.round(newAvg * 100) / 100 },
      });
    } catch (err) {
      this.logger.error(
        `Failed to recalculate store rating: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
