// =============================================================================
// Review Repository Port — outbound interface (ADR-024)
// =============================================================================

import type { Review } from '../domain/entities/review.entity';

export interface CreateReviewData {
  reservationId: string;
  consumerId: string;
  partnerId: string;
  rating: number;
  comment?: string;
  editableUntil: Date;
}

export interface UpdateReviewData {
  rating?: number;
  comment?: string | null;
}

export abstract class ReviewRepositoryPort {
  abstract findById(id: string): Promise<Review | null>;
  abstract findByReservationId(reservationId: string): Promise<Review | null>;
  abstract findByStoreId(
    storeId: string,
    page?: number,
    limit?: number,
  ): Promise<{ data: Review[]; total: number }>;
  abstract create(data: CreateReviewData): Promise<Review>;
  abstract update(id: string, data: UpdateReviewData): Promise<Review>;
  abstract delete(id: string): Promise<void>;
}
