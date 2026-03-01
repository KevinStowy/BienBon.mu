// =============================================================================
// Partner Repository Port — outbound port (driven adapter interface)
// =============================================================================
// ADR-024: Hexagonal architecture — domain drives persistence via ports.
// The application layer depends on this abstract class, never on Prisma directly.
// =============================================================================

import type { PartnerStatus } from '@bienbon/shared-types';
import type { Partner } from '../domain/partner.entity';

export interface PartnerListFilters {
  status?: PartnerStatus;
}

export interface PartnerPagination {
  page: number;
  limit: number;
}

export interface PaginatedPartners {
  data: Partner[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface PartnerStatusUpdate {
  status: PartnerStatus;
  statusReason: string | null;
  statusChangedAt: Date;
  statusChangedBy: string;
  validatedAt?: Date;
  validatedBy?: string;
}

/**
 * Outbound port (driven adapter interface) for partner profile persistence.
 *
 * ADR-024: The domain and application layers depend on this interface —
 * not on Prisma directly.
 */
export abstract class PartnerRepositoryPort {
  /** Find a single partner profile by its UUID. Throws if not found. */
  abstract findById(partnerId: string): Promise<Partner | null>;

  /** Find a single partner profile by user UUID. Returns null if not found. */
  abstract findByUserId(userId: string): Promise<Partner | null>;

  /** Find paginated list of partners with optional status filter. */
  abstract listAll(
    filters: PartnerListFilters,
    pagination: PartnerPagination,
  ): Promise<PaginatedPartners>;

  /** Update partner status fields atomically. */
  abstract updateStatus(
    partnerId: string,
    update: PartnerStatusUpdate,
  ): Promise<Partner>;
}
