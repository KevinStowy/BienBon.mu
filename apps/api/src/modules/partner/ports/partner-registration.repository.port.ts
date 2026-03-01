// =============================================================================
// Partner Registration Repository Port — outbound port
// =============================================================================
// ADR-024: Hexagonal architecture — the application layer depends on this
// interface, not on Prisma directly.
// =============================================================================

import type { ApprovalStatus } from '@bienbon/shared-types';

/**
 * Minimal shape of a PartnerProfile record as returned from the adapter.
 */
export interface PartnerProfileRecord {
  id: string;
  userId: string;
  registrationChannel: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Minimal shape of a PartnerRegistrationRequest record.
 */
export interface PartnerRegistrationRequestRecord {
  id: string;
  userId: string;
  status: string;
  businessData: unknown;
  documentUrls: unknown;
  registrationChannel: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePartnerProfileData {
  userId: string;
  registrationChannel: string;
}

export interface CreateRegistrationRequestData {
  userId: string;
  businessData: object;
  documentUrls: object;
  registrationChannel: string;
}

/**
 * Outbound port for partner registration persistence.
 */
export abstract class PartnerRegistrationRepositoryPort {
  /**
   * Find an active (PENDING or IN_REVIEW) registration request for a user.
   * Returns null if none exists.
   */
  abstract findActiveRequest(userId: string): Promise<PartnerRegistrationRequestRecord | null>;

  /**
   * Find an existing partner profile for a user. Returns null if none.
   */
  abstract findProfileByUserId(userId: string): Promise<PartnerProfileRecord | null>;

  /**
   * Find a registration request by ID and userId. Returns null if not found
   * or if the request does not belong to the user.
   */
  abstract findRequestByIdAndUser(
    requestId: string,
    userId: string,
  ): Promise<PartnerRegistrationRequestRecord | null>;

  /**
   * Get the most recent registration request for a user.
   */
  abstract findMostRecentRequest(userId: string): Promise<PartnerRegistrationRequestRecord | null>;

  /**
   * Atomically create a partner profile (if it does not exist) and a new
   * registration request. Returns both created/found records.
   */
  abstract createProfileAndRequest(
    profileData: CreatePartnerProfileData,
    requestData: CreateRegistrationRequestData,
  ): Promise<{
    partnerProfile: PartnerProfileRecord;
    registrationRequest: PartnerRegistrationRequestRecord;
  }>;

  /**
   * Cancel a registration request by updating its status to CANCELLED.
   */
  abstract cancelRequest(requestId: string): Promise<PartnerRegistrationRequestRecord>;

  /**
   * List all registration requests, optionally filtered by status.
   */
  abstract listAllRequests(
    filters: { status?: ApprovalStatus },
  ): Promise<PartnerRegistrationRequestRecord[]>;
}
