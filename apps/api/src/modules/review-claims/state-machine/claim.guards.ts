// =============================================================================
// Claim State Machine Guards
// =============================================================================

import type { TransitionContext } from '../../../shared/state-machine';
import type { Claim } from '../domain/entities/claim.entity';

/**
 * Guard: only admin or super_admin can trigger admin transitions.
 */
export function guardAdminOnly(ctx: TransitionContext<Claim>): boolean {
  return ctx.actorRole === 'admin';
}

/**
 * Guard: claim must not yet be assigned to an admin (to prevent double take-charge).
 */
export function guardClaimNotAssigned(ctx: TransitionContext<Claim>): boolean {
  return ctx.entity.assignedAdminId === null;
}

/**
 * Guard: refund amount must be a positive number (for partial refunds).
 */
export function guardAmountValid(ctx: TransitionContext<Claim>): boolean {
  const amount = ctx.metadata?.['amount'];
  return typeof amount === 'number' && amount > 0;
}

/**
 * Guard: rejection reason must be provided.
 */
export function guardReasonRequired(ctx: TransitionContext<Claim>): boolean {
  const reason = ctx.metadata?.['reason'];
  return typeof reason === 'string' && reason.trim().length > 0;
}
