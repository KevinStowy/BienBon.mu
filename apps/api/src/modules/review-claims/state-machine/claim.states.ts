// =============================================================================
// Claim State Machine — States and Events (ADR-017)
// =============================================================================

import { ClaimStatus } from '@bienbon/shared-types';

export { ClaimStatus as ClaimState };

export enum ClaimEvent {
  ADMIN_TAKE_CHARGE = 'ADMIN_TAKE_CHARGE',
  ADMIN_RESOLVE_FULL_REFUND = 'ADMIN_RESOLVE_FULL_REFUND',
  ADMIN_RESOLVE_PARTIAL_REFUND = 'ADMIN_RESOLVE_PARTIAL_REFUND',
  ADMIN_REJECT = 'ADMIN_REJECT',
  AUTO_EXPIRE = 'AUTO_EXPIRE',
}
