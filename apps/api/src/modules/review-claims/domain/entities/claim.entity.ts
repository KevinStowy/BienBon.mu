// =============================================================================
// Claim — domain entity
// =============================================================================

import type { ClaimStatus, ResolutionType } from '@bienbon/shared-types';

export interface ClaimPhoto {
  id: string;
  url: string;
  position: number;
}

export interface Claim {
  id: string;
  reservationId: string;
  consumerId: string;
  reasonSlug: string;
  description: string;
  status: ClaimStatus;
  assignedAdminId: string | null;
  resolutionType: ResolutionType | null;
  resolutionAmount: number | null;
  adminComment: string | null;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  photos: ClaimPhoto[];
  createdAt: Date;
  updatedAt: Date;
}
