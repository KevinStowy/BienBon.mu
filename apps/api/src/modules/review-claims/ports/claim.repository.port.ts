// =============================================================================
// Claim Repository Port — outbound interface (ADR-024)
// =============================================================================

import type { ClaimStatus } from '@bienbon/shared-types';
import type { Claim } from '../domain/entities/claim.entity';

export interface CreateClaimData {
  reservationId: string;
  consumerId: string;
  reasonSlug: string;
  description: string;
  photoUrls: string[];
}

export interface UpdateClaimData {
  status?: ClaimStatus;
  assignedAdminId?: string | null;
  resolutionType?: string;
  resolutionAmount?: number | null;
  adminComment?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: Date | null;
}

export interface ListClaimsFilter {
  status?: ClaimStatus;
  consumerId?: string;
  page?: number;
  limit?: number;
}

export abstract class ClaimRepositoryPort {
  abstract findById(id: string): Promise<Claim | null>;
  abstract findByReservationId(reservationId: string): Promise<Claim[]>;
  abstract findByConsumerId(
    consumerId: string,
    page?: number,
    limit?: number,
  ): Promise<{ data: Claim[]; total: number }>;
  abstract listAll(filter: ListClaimsFilter): Promise<{ data: Claim[]; total: number }>;
  abstract create(data: CreateClaimData): Promise<Claim>;
  abstract update(id: string, data: UpdateClaimData): Promise<Claim>;
  abstract createStatusHistory(data: {
    claimId: string;
    fromStatus: string;
    toStatus: string;
    event: string;
    actorId?: string;
    actorRole?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}
