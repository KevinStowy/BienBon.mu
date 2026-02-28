// =============================================================================
// Store Approval State Machine Guards
// =============================================================================

import type { TransitionContext } from '../../../shared/state-machine';

type ApprovalRequestEntity = {
  id: string;
  storeId: string;
  submittedBy: string;
  status: string;
};

/**
 * Guard: only admin role can assign/release/approve/reject.
 */
export function guardAdminOnly(ctx: TransitionContext<ApprovalRequestEntity>): boolean {
  return ctx.actorRole === 'admin';
}

/**
 * Guard: rejection reason must be present.
 */
export function guardRejectionReasonRequired(
  ctx: TransitionContext<ApprovalRequestEntity>,
): boolean {
  const reason = ctx.metadata?.['reason'];
  return typeof reason === 'string' && reason.trim().length > 0;
}

/**
 * Guard: only the partner who submitted the request or an admin can cancel.
 */
export function guardPartnerOrAdmin(ctx: TransitionContext<ApprovalRequestEntity>): boolean {
  return ctx.actorRole === 'admin' || ctx.actorId === ctx.entity.submittedBy;
}
