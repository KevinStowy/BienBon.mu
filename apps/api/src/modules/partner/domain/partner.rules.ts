// =============================================================================
// Partner Domain Rules — pure functions, no side effects
// =============================================================================

import { PartnerStatus } from '@bienbon/shared-types';
import type { Partner } from './partner.entity';

/**
 * Returns true if the partner can be validated (approved).
 * Only PENDING or REJECTED partners can be approved.
 */
export function canValidate(partner: Partner): boolean {
  return partner.status === PartnerStatus.PENDING || partner.status === PartnerStatus.REJECTED;
}

/**
 * Returns true if the partner can be rejected.
 * Only PENDING partners can be rejected.
 */
export function canReject(partner: Partner): boolean {
  return partner.status === PartnerStatus.PENDING;
}

/**
 * Returns true if the partner can be suspended.
 * Only ACTIVE partners can be suspended.
 */
export function canSuspend(partner: Partner): boolean {
  return partner.status === PartnerStatus.ACTIVE;
}

/**
 * Returns true if the partner can be reactivated.
 * Only SUSPENDED partners can be reactivated.
 */
export function canReactivate(partner: Partner): boolean {
  return partner.status === PartnerStatus.SUSPENDED;
}

/**
 * Returns true if the partner can be banned.
 * ACTIVE and SUSPENDED partners can be banned.
 */
export function canBan(partner: Partner): boolean {
  return (
    partner.status === PartnerStatus.ACTIVE || partner.status === PartnerStatus.SUSPENDED
  );
}

/**
 * Returns true if the partner (user) can cancel their own registration.
 * Only PENDING partners can cancel before processing.
 */
export function canCancelRegistration(partner: Partner): boolean {
  return partner.status === PartnerStatus.PENDING;
}

/**
 * Returns true if the partner is active and can operate.
 */
export function isActive(partner: Partner): boolean {
  return partner.status === PartnerStatus.ACTIVE;
}
