// =============================================================================
// Claim State Machine Transition Table (ADR-017)
// =============================================================================
// C1: OPEN      + ADMIN_TAKE_CHARGE           -> IN_REVIEW  (admin, not assigned)
// C2: OPEN      + AUTO_EXPIRE                 -> REJECTED   (not assigned, 30 day)
// C3: IN_REVIEW + ADMIN_RESOLVE_FULL_REFUND   -> RESOLVED   (admin)
// C4: IN_REVIEW + ADMIN_RESOLVE_PARTIAL_REFUND-> RESOLVED   (admin, amount valid)
// C5: IN_REVIEW + ADMIN_REJECT                -> REJECTED   (admin, reason required)
// RESOLVED and REJECTED are terminal states.
// =============================================================================

import { ClaimStatus } from '@bienbon/shared-types';
import type { TransitionTable } from '../../../shared/state-machine';
import type { Claim } from '../domain/entities/claim.entity';
import { ClaimEvent } from './claim.states';
import {
  guardAdminOnly,
  guardAmountValid,
  guardClaimNotAssigned,
  guardReasonRequired,
} from './claim.guards';

export function buildClaimTransitionTable(): TransitionTable<ClaimStatus, ClaimEvent, Claim> {
  return {
    [ClaimStatus.OPEN]: {
      [ClaimEvent.ADMIN_TAKE_CHARGE]: {
        target: ClaimStatus.IN_REVIEW,
        guards: [guardAdminOnly, guardClaimNotAssigned],
        description: 'C1: Admin takes charge of an open claim',
      },
      [ClaimEvent.AUTO_EXPIRE]: {
        target: ClaimStatus.REJECTED,
        guards: [guardClaimNotAssigned],
        description: 'C2: System auto-expires an unassigned open claim after 30 days',
      },
    },
    [ClaimStatus.IN_REVIEW]: {
      [ClaimEvent.ADMIN_RESOLVE_FULL_REFUND]: {
        target: ClaimStatus.RESOLVED,
        guards: [guardAdminOnly],
        description: 'C3: Admin resolves claim with full refund',
      },
      [ClaimEvent.ADMIN_RESOLVE_PARTIAL_REFUND]: {
        target: ClaimStatus.RESOLVED,
        guards: [guardAdminOnly, guardAmountValid],
        description: 'C4: Admin resolves claim with partial refund (amount required)',
      },
      [ClaimEvent.ADMIN_REJECT]: {
        target: ClaimStatus.REJECTED,
        guards: [guardAdminOnly, guardReasonRequired],
        description: 'C5: Admin rejects claim with reason',
      },
    },
    // Terminal states — no transitions out
    [ClaimStatus.RESOLVED]: {},
    [ClaimStatus.REJECTED]: {},
  };
}
