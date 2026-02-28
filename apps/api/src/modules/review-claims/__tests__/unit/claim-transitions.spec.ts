// =============================================================================
// Claim State Machine Transition Tests
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { ClaimStatus } from '@bienbon/shared-types';
import { StateMachineService } from '../../../../shared/state-machine';
import { buildClaimTransitionTable } from '../../state-machine/claim.transitions';
import { ClaimEvent } from '../../state-machine/claim.states';
import type { Claim } from '../../domain/entities/claim.entity';
import type { TransitionContext } from '../../../../shared/state-machine';

function makeClaim(overrides: Partial<Claim> = {}): Claim {
  return {
    id: 'claim-1',
    reservationId: 'reservation-1',
    consumerId: 'consumer-1',
    reasonSlug: 'wrong-product',
    description: 'The product I received was wrong',
    status: ClaimStatus.OPEN,
    assignedAdminId: null,
    resolutionType: null,
    resolutionAmount: null,
    adminComment: null,
    resolvedBy: null,
    resolvedAt: null,
    photos: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeAdminCtx(
  claim: Claim,
  metadata: Record<string, unknown> = {},
): TransitionContext<Claim> {
  return {
    entity: claim,
    actorId: 'admin-1',
    actorRole: 'admin',
    metadata,
    timestamp: new Date(),
  };
}

function makeConsumerCtx(
  claim: Claim,
  metadata: Record<string, unknown> = {},
): TransitionContext<Claim> {
  return {
    entity: claim,
    actorId: 'consumer-1',
    actorRole: 'consumer',
    metadata,
    timestamp: new Date(),
  };
}

describe('Claim State Machine Transitions', () => {
  let stateMachine: StateMachineService;
  const table = buildClaimTransitionTable();

  beforeEach(() => {
    stateMachine = new StateMachineService();
  });

  // ---------------------------------------------------------------------------
  // Valid transitions
  // ---------------------------------------------------------------------------

  describe('OPEN + ADMIN_TAKE_CHARGE -> IN_REVIEW', () => {
    it('succeeds when admin takes charge of an unassigned claim', async () => {
      const claim = makeClaim({ status: ClaimStatus.OPEN, assignedAdminId: null });
      const ctx = makeAdminCtx(claim);

      const nextState = await stateMachine.transition(
        claim.status,
        ClaimEvent.ADMIN_TAKE_CHARGE,
        table,
        ctx,
      );

      expect(nextState).toBe(ClaimStatus.IN_REVIEW);
    });
  });

  describe('OPEN + AUTO_EXPIRE -> REJECTED', () => {
    it('succeeds for an unassigned open claim (system auto-expire)', async () => {
      const claim = makeClaim({ status: ClaimStatus.OPEN, assignedAdminId: null });
      const ctx: TransitionContext<Claim> = {
        entity: claim,
        actorId: 'system',
        actorRole: 'system',
        timestamp: new Date(),
      };

      const nextState = await stateMachine.transition(
        claim.status,
        ClaimEvent.AUTO_EXPIRE,
        table,
        ctx,
      );

      expect(nextState).toBe(ClaimStatus.REJECTED);
    });
  });

  describe('IN_REVIEW + ADMIN_RESOLVE_FULL_REFUND -> RESOLVED', () => {
    it('succeeds for an admin resolving with full refund', async () => {
      const claim = makeClaim({
        status: ClaimStatus.IN_REVIEW,
        assignedAdminId: 'admin-1',
      });
      const ctx = makeAdminCtx(claim);

      const nextState = await stateMachine.transition(
        claim.status,
        ClaimEvent.ADMIN_RESOLVE_FULL_REFUND,
        table,
        ctx,
      );

      expect(nextState).toBe(ClaimStatus.RESOLVED);
    });
  });

  describe('IN_REVIEW + ADMIN_RESOLVE_PARTIAL_REFUND -> RESOLVED', () => {
    it('succeeds when amount is valid', async () => {
      const claim = makeClaim({
        status: ClaimStatus.IN_REVIEW,
        assignedAdminId: 'admin-1',
      });
      const ctx = makeAdminCtx(claim, { amount: 50.0 });

      const nextState = await stateMachine.transition(
        claim.status,
        ClaimEvent.ADMIN_RESOLVE_PARTIAL_REFUND,
        table,
        ctx,
      );

      expect(nextState).toBe(ClaimStatus.RESOLVED);
    });
  });

  describe('IN_REVIEW + ADMIN_REJECT -> REJECTED', () => {
    it('succeeds when reason is provided', async () => {
      const claim = makeClaim({
        status: ClaimStatus.IN_REVIEW,
        assignedAdminId: 'admin-1',
      });
      const ctx = makeAdminCtx(claim, { reason: 'Not enough evidence provided' });

      const nextState = await stateMachine.transition(
        claim.status,
        ClaimEvent.ADMIN_REJECT,
        table,
        ctx,
      );

      expect(nextState).toBe(ClaimStatus.REJECTED);
    });
  });

  // ---------------------------------------------------------------------------
  // Guard failures
  // ---------------------------------------------------------------------------

  describe('Guard: adminRole', () => {
    it('rejects ADMIN_TAKE_CHARGE when actor is a consumer', async () => {
      const claim = makeClaim({ status: ClaimStatus.OPEN, assignedAdminId: null });
      const ctx = makeConsumerCtx(claim);

      await expect(
        stateMachine.transition(claim.status, ClaimEvent.ADMIN_TAKE_CHARGE, table, ctx),
      ).rejects.toThrow();
    });

    it('rejects ADMIN_RESOLVE_FULL_REFUND when actor is a consumer', async () => {
      const claim = makeClaim({ status: ClaimStatus.IN_REVIEW });
      const ctx = makeConsumerCtx(claim);

      await expect(
        stateMachine.transition(claim.status, ClaimEvent.ADMIN_RESOLVE_FULL_REFUND, table, ctx),
      ).rejects.toThrow();
    });
  });

  describe('Guard: claimNotAssigned', () => {
    it('rejects ADMIN_TAKE_CHARGE when claim is already assigned', async () => {
      const claim = makeClaim({
        status: ClaimStatus.OPEN,
        assignedAdminId: 'other-admin',
      });
      const ctx = makeAdminCtx(claim);

      await expect(
        stateMachine.transition(claim.status, ClaimEvent.ADMIN_TAKE_CHARGE, table, ctx),
      ).rejects.toThrow();
    });
  });

  describe('Guard: amountValid', () => {
    it('rejects ADMIN_RESOLVE_PARTIAL_REFUND when amount is missing', async () => {
      const claim = makeClaim({ status: ClaimStatus.IN_REVIEW });
      const ctx = makeAdminCtx(claim, {}); // no amount in metadata

      await expect(
        stateMachine.transition(claim.status, ClaimEvent.ADMIN_RESOLVE_PARTIAL_REFUND, table, ctx),
      ).rejects.toThrow();
    });

    it('rejects ADMIN_RESOLVE_PARTIAL_REFUND when amount is zero', async () => {
      const claim = makeClaim({ status: ClaimStatus.IN_REVIEW });
      const ctx = makeAdminCtx(claim, { amount: 0 });

      await expect(
        stateMachine.transition(claim.status, ClaimEvent.ADMIN_RESOLVE_PARTIAL_REFUND, table, ctx),
      ).rejects.toThrow();
    });

    it('rejects ADMIN_RESOLVE_PARTIAL_REFUND when amount is negative', async () => {
      const claim = makeClaim({ status: ClaimStatus.IN_REVIEW });
      const ctx = makeAdminCtx(claim, { amount: -10 });

      await expect(
        stateMachine.transition(claim.status, ClaimEvent.ADMIN_RESOLVE_PARTIAL_REFUND, table, ctx),
      ).rejects.toThrow();
    });
  });

  describe('Guard: reasonRequired', () => {
    it('rejects ADMIN_REJECT when reason is missing', async () => {
      const claim = makeClaim({ status: ClaimStatus.IN_REVIEW });
      const ctx = makeAdminCtx(claim, {}); // no reason

      await expect(
        stateMachine.transition(claim.status, ClaimEvent.ADMIN_REJECT, table, ctx),
      ).rejects.toThrow();
    });

    it('rejects ADMIN_REJECT when reason is an empty string', async () => {
      const claim = makeClaim({ status: ClaimStatus.IN_REVIEW });
      const ctx = makeAdminCtx(claim, { reason: '   ' });

      await expect(
        stateMachine.transition(claim.status, ClaimEvent.ADMIN_REJECT, table, ctx),
      ).rejects.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Terminal states — no transitions allowed out
  // ---------------------------------------------------------------------------

  describe('Terminal states', () => {
    it('rejects any event from RESOLVED state', async () => {
      const claim = makeClaim({ status: ClaimStatus.RESOLVED });
      const ctx = makeAdminCtx(claim);

      await expect(
        stateMachine.transition(
          claim.status,
          ClaimEvent.ADMIN_RESOLVE_FULL_REFUND,
          table,
          ctx,
        ),
      ).rejects.toThrow();
    });

    it('rejects any event from REJECTED state', async () => {
      const claim = makeClaim({ status: ClaimStatus.REJECTED });
      const ctx = makeAdminCtx(claim);

      await expect(
        stateMachine.transition(claim.status, ClaimEvent.ADMIN_REJECT, table, ctx),
      ).rejects.toThrow();
    });

    it('rejects ADMIN_TAKE_CHARGE from RESOLVED state', async () => {
      const claim = makeClaim({ status: ClaimStatus.RESOLVED });
      const ctx = makeAdminCtx(claim);

      await expect(
        stateMachine.transition(claim.status, ClaimEvent.ADMIN_TAKE_CHARGE, table, ctx),
      ).rejects.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Invalid transitions (event not defined for state)
  // ---------------------------------------------------------------------------

  describe('Invalid transitions', () => {
    it('rejects ADMIN_RESOLVE_FULL_REFUND from OPEN state', async () => {
      const claim = makeClaim({ status: ClaimStatus.OPEN });
      const ctx = makeAdminCtx(claim);

      await expect(
        stateMachine.transition(
          claim.status,
          ClaimEvent.ADMIN_RESOLVE_FULL_REFUND,
          table,
          ctx,
        ),
      ).rejects.toThrow();
    });

    it('rejects ADMIN_REJECT from OPEN state', async () => {
      const claim = makeClaim({ status: ClaimStatus.OPEN });
      const ctx = makeAdminCtx(claim, { reason: 'some reason' });

      await expect(
        stateMachine.transition(claim.status, ClaimEvent.ADMIN_REJECT, table, ctx),
      ).rejects.toThrow();
    });

    it('rejects ADMIN_TAKE_CHARGE from IN_REVIEW state', async () => {
      const claim = makeClaim({
        status: ClaimStatus.IN_REVIEW,
        assignedAdminId: null,
      });
      const ctx = makeAdminCtx(claim);

      await expect(
        stateMachine.transition(claim.status, ClaimEvent.ADMIN_TAKE_CHARGE, table, ctx),
      ).rejects.toThrow();
    });
  });
});
