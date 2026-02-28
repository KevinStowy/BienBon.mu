// =============================================================================
// Partner State Machine Guards
// =============================================================================

import type { TransitionContext } from '../../../shared/state-machine';
import type { Partner } from '../domain/partner.entity';

/**
 * Guard: only admin or super_admin can trigger admin transitions.
 */
export function guardAdminOnly(ctx: TransitionContext<Partner>): boolean {
  return ctx.actorRole === 'admin';
}

/**
 * Guard: rejection reason must be provided (checked via metadata).
 */
export function guardRejectionReasonRequired(ctx: TransitionContext<Partner>): boolean {
  const reason = ctx.metadata?.['reason'];
  return typeof reason === 'string' && reason.trim().length > 0;
}

/**
 * Guard: suspension reason must be provided.
 */
export function guardSuspensionReasonRequired(ctx: TransitionContext<Partner>): boolean {
  const reason = ctx.metadata?.['reason'];
  return typeof reason === 'string' && reason.trim().length > 0;
}

/**
 * Guard: ban requires a reason and double confirmation.
 */
export function guardBanRequired(ctx: TransitionContext<Partner>): boolean {
  const reason = ctx.metadata?.['reason'];
  const confirmed = ctx.metadata?.['confirmed'];
  return (
    typeof reason === 'string' &&
    reason.trim().length > 0 &&
    confirmed === true
  );
}
