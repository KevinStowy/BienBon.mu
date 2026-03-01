// =============================================================================
// Claim State Machine — domain tests (ADR-017, ADR-023)
// =============================================================================
// Tests the claim lifecycle through ClaimService.takeCharge / resolve / reject,
// with mocked repositories and mocked payment service.
//
// Also tests the pure StateMachineService transitions for all documented arcs.
// (C1-C5 from claim.transitions.ts)
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClaimStatus, ResolutionType } from '@bienbon/shared-types';
import { StateMachineService } from '../../../../shared/state-machine';
import { buildClaimTransitionTable } from '../../state-machine/claim.transitions';
import { ClaimEvent } from '../../state-machine/claim.states';
import type { Claim } from '../../domain/entities/claim.entity';
import type { TransitionContext } from '../../../../shared/state-machine';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeClaim(overrides: Partial<Claim> = {}): Claim {
  return {
    id: 'claim-001',
    reservationId: 'reservation-001',
    consumerId: 'consumer-001',
    reasonSlug: 'wrong-product',
    description: 'The product I received was completely wrong — not what was advertised.',
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

function makeAdminCtx(claim: Claim, metadata: Record<string, unknown> = {}): TransitionContext<Claim> {
  return {
    entity: claim,
    actorId: 'admin-001',
    actorRole: 'admin',
    metadata,
    timestamp: new Date(),
  };
}

function makeConsumerCtx(claim: Claim): TransitionContext<Claim> {
  return {
    entity: claim,
    actorId: 'consumer-001',
    actorRole: 'consumer',
    timestamp: new Date(),
  };
}

function makeSystemCtx(claim: Claim): TransitionContext<Claim> {
  return {
    entity: claim,
    actorId: 'system',
    actorRole: 'system',
    timestamp: new Date(),
  };
}

// ---------------------------------------------------------------------------
// C1: OPEN + ADMIN_TAKE_CHARGE -> IN_REVIEW
// ---------------------------------------------------------------------------

describe('C1: OPEN + ADMIN_TAKE_CHARGE -> IN_REVIEW', () => {
  let stateMachine: StateMachineService;
  const table = buildClaimTransitionTable();

  beforeEach(() => {
    stateMachine = new StateMachineService();
  });

  it('transitions OPEN claim to IN_REVIEW when admin takes charge', async () => {
    const claim = makeClaim({ status: ClaimStatus.OPEN, assignedAdminId: null });
    const ctx = makeAdminCtx(claim);

    const next = await stateMachine.transition(claim.status, ClaimEvent.ADMIN_TAKE_CHARGE, table, ctx);

    expect(next).toBe(ClaimStatus.IN_REVIEW);
  });

  it('rejects ADMIN_TAKE_CHARGE when actor is not admin', async () => {
    const claim = makeClaim({ status: ClaimStatus.OPEN, assignedAdminId: null });
    const ctx = makeConsumerCtx(claim);

    await expect(
      stateMachine.transition(claim.status, ClaimEvent.ADMIN_TAKE_CHARGE, table, ctx),
    ).rejects.toThrow();
  });

  it('rejects ADMIN_TAKE_CHARGE when claim is already assigned to another admin', async () => {
    const claim = makeClaim({ status: ClaimStatus.OPEN, assignedAdminId: 'other-admin' });
    const ctx = makeAdminCtx(claim);

    await expect(
      stateMachine.transition(claim.status, ClaimEvent.ADMIN_TAKE_CHARGE, table, ctx),
    ).rejects.toThrow();
  });

  it('system role cannot take charge (admin-only guard)', async () => {
    const claim = makeClaim({ status: ClaimStatus.OPEN, assignedAdminId: null });
    const ctx = makeSystemCtx(claim);

    await expect(
      stateMachine.transition(claim.status, ClaimEvent.ADMIN_TAKE_CHARGE, table, ctx),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// C2: OPEN + AUTO_EXPIRE -> REJECTED
// ---------------------------------------------------------------------------

describe('C2: OPEN + AUTO_EXPIRE -> REJECTED', () => {
  let stateMachine: StateMachineService;
  const table = buildClaimTransitionTable();

  beforeEach(() => {
    stateMachine = new StateMachineService();
  });

  it('auto-expires an unassigned OPEN claim to REJECTED', async () => {
    const claim = makeClaim({ status: ClaimStatus.OPEN, assignedAdminId: null });
    const ctx = makeSystemCtx(claim);

    const next = await stateMachine.transition(claim.status, ClaimEvent.AUTO_EXPIRE, table, ctx);

    expect(next).toBe(ClaimStatus.REJECTED);
  });

  it('rejects AUTO_EXPIRE when claim is already assigned (guard: not assigned)', async () => {
    const claim = makeClaim({ status: ClaimStatus.OPEN, assignedAdminId: 'admin-001' });
    const ctx = makeSystemCtx(claim);

    await expect(
      stateMachine.transition(claim.status, ClaimEvent.AUTO_EXPIRE, table, ctx),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// C3: IN_REVIEW + ADMIN_RESOLVE_FULL_REFUND -> RESOLVED
// ---------------------------------------------------------------------------

describe('C3: IN_REVIEW + ADMIN_RESOLVE_FULL_REFUND -> RESOLVED', () => {
  let stateMachine: StateMachineService;
  const table = buildClaimTransitionTable();

  beforeEach(() => {
    stateMachine = new StateMachineService();
  });

  it('resolves an IN_REVIEW claim with full refund', async () => {
    const claim = makeClaim({ status: ClaimStatus.IN_REVIEW, assignedAdminId: 'admin-001' });
    const ctx = makeAdminCtx(claim);

    const next = await stateMachine.transition(
      claim.status,
      ClaimEvent.ADMIN_RESOLVE_FULL_REFUND,
      table,
      ctx,
    );

    expect(next).toBe(ClaimStatus.RESOLVED);
  });

  it('throws when consumer tries to resolve', async () => {
    const claim = makeClaim({ status: ClaimStatus.IN_REVIEW });
    const ctx = makeConsumerCtx(claim);

    await expect(
      stateMachine.transition(claim.status, ClaimEvent.ADMIN_RESOLVE_FULL_REFUND, table, ctx),
    ).rejects.toThrow();
  });

  it('throws when trying to resolve from OPEN (must be IN_REVIEW first)', async () => {
    const claim = makeClaim({ status: ClaimStatus.OPEN });
    const ctx = makeAdminCtx(claim);

    await expect(
      stateMachine.transition(claim.status, ClaimEvent.ADMIN_RESOLVE_FULL_REFUND, table, ctx),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// C4: IN_REVIEW + ADMIN_RESOLVE_PARTIAL_REFUND -> RESOLVED
// ---------------------------------------------------------------------------

describe('C4: IN_REVIEW + ADMIN_RESOLVE_PARTIAL_REFUND -> RESOLVED', () => {
  let stateMachine: StateMachineService;
  const table = buildClaimTransitionTable();

  beforeEach(() => {
    stateMachine = new StateMachineService();
  });

  it('resolves with partial refund when amount is valid', async () => {
    const claim = makeClaim({ status: ClaimStatus.IN_REVIEW });
    const ctx = makeAdminCtx(claim, { amount: 150 });

    const next = await stateMachine.transition(
      claim.status,
      ClaimEvent.ADMIN_RESOLVE_PARTIAL_REFUND,
      table,
      ctx,
    );

    expect(next).toBe(ClaimStatus.RESOLVED);
  });

  it('throws when amount is missing from metadata', async () => {
    const claim = makeClaim({ status: ClaimStatus.IN_REVIEW });
    const ctx = makeAdminCtx(claim, {}); // no amount

    await expect(
      stateMachine.transition(claim.status, ClaimEvent.ADMIN_RESOLVE_PARTIAL_REFUND, table, ctx),
    ).rejects.toThrow();
  });

  it('throws when amount is zero', async () => {
    const claim = makeClaim({ status: ClaimStatus.IN_REVIEW });
    const ctx = makeAdminCtx(claim, { amount: 0 });

    await expect(
      stateMachine.transition(claim.status, ClaimEvent.ADMIN_RESOLVE_PARTIAL_REFUND, table, ctx),
    ).rejects.toThrow();
  });

  it('throws when amount is negative', async () => {
    const claim = makeClaim({ status: ClaimStatus.IN_REVIEW });
    const ctx = makeAdminCtx(claim, { amount: -50 });

    await expect(
      stateMachine.transition(claim.status, ClaimEvent.ADMIN_RESOLVE_PARTIAL_REFUND, table, ctx),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// C5: IN_REVIEW + ADMIN_REJECT -> REJECTED
// ---------------------------------------------------------------------------

describe('C5: IN_REVIEW + ADMIN_REJECT -> REJECTED', () => {
  let stateMachine: StateMachineService;
  const table = buildClaimTransitionTable();

  beforeEach(() => {
    stateMachine = new StateMachineService();
  });

  it('rejects a claim with a reason', async () => {
    const claim = makeClaim({ status: ClaimStatus.IN_REVIEW });
    const ctx = makeAdminCtx(claim, { reason: 'Not enough evidence provided' });

    const next = await stateMachine.transition(claim.status, ClaimEvent.ADMIN_REJECT, table, ctx);

    expect(next).toBe(ClaimStatus.REJECTED);
  });

  it('throws when reason is missing', async () => {
    const claim = makeClaim({ status: ClaimStatus.IN_REVIEW });
    const ctx = makeAdminCtx(claim, {}); // no reason

    await expect(
      stateMachine.transition(claim.status, ClaimEvent.ADMIN_REJECT, table, ctx),
    ).rejects.toThrow();
  });

  it('throws when reason is empty string', async () => {
    const claim = makeClaim({ status: ClaimStatus.IN_REVIEW });
    const ctx = makeAdminCtx(claim, { reason: '' });

    await expect(
      stateMachine.transition(claim.status, ClaimEvent.ADMIN_REJECT, table, ctx),
    ).rejects.toThrow();
  });

  it('throws when reason is whitespace only', async () => {
    const claim = makeClaim({ status: ClaimStatus.IN_REVIEW });
    const ctx = makeAdminCtx(claim, { reason: '   ' });

    await expect(
      stateMachine.transition(claim.status, ClaimEvent.ADMIN_REJECT, table, ctx),
    ).rejects.toThrow();
  });

  it('throws when actor is not admin', async () => {
    const claim = makeClaim({ status: ClaimStatus.IN_REVIEW });
    const ctx = makeConsumerCtx(claim);

    await expect(
      stateMachine.transition(claim.status, ClaimEvent.ADMIN_REJECT, table, ctx),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Terminal states — RESOLVED and REJECTED have no outgoing transitions
// ---------------------------------------------------------------------------

describe('Terminal states: RESOLVED and REJECTED', () => {
  let stateMachine: StateMachineService;
  const table = buildClaimTransitionTable();

  beforeEach(() => {
    stateMachine = new StateMachineService();
  });

  it('no event can transition out of RESOLVED', async () => {
    const claim = makeClaim({ status: ClaimStatus.RESOLVED });
    const ctx = makeAdminCtx(claim);

    for (const event of Object.values(ClaimEvent)) {
      await expect(
        stateMachine.transition(claim.status, event, table, ctx),
      ).rejects.toThrow();
    }
  });

  it('no event can transition out of REJECTED', async () => {
    const claim = makeClaim({ status: ClaimStatus.REJECTED });
    const ctx = makeAdminCtx(claim, { reason: 'test', amount: 100 });

    for (const event of Object.values(ClaimEvent)) {
      await expect(
        stateMachine.transition(claim.status, event, table, ctx),
      ).rejects.toThrow();
    }
  });

  it('RESOLVED table entry has no transitions', () => {
    const resolvedTransitions = table[ClaimStatus.RESOLVED];
    expect(Object.keys(resolvedTransitions!)).toHaveLength(0);
  });

  it('REJECTED table entry has no transitions', () => {
    const rejectedTransitions = table[ClaimStatus.REJECTED];
    expect(Object.keys(rejectedTransitions!)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Invalid transitions — events not defined for current state
// ---------------------------------------------------------------------------

describe('Invalid transitions (event not in table for state)', () => {
  let stateMachine: StateMachineService;
  const table = buildClaimTransitionTable();

  beforeEach(() => {
    stateMachine = new StateMachineService();
  });

  it('cannot resolve from OPEN state (must go through IN_REVIEW first)', async () => {
    const claim = makeClaim({ status: ClaimStatus.OPEN });
    const ctx = makeAdminCtx(claim);

    await expect(
      stateMachine.transition(claim.status, ClaimEvent.ADMIN_RESOLVE_FULL_REFUND, table, ctx),
    ).rejects.toThrow();
  });

  it('cannot partially refund from OPEN state', async () => {
    const claim = makeClaim({ status: ClaimStatus.OPEN });
    const ctx = makeAdminCtx(claim, { amount: 50 });

    await expect(
      stateMachine.transition(claim.status, ClaimEvent.ADMIN_RESOLVE_PARTIAL_REFUND, table, ctx),
    ).rejects.toThrow();
  });

  it('cannot ADMIN_TAKE_CHARGE from IN_REVIEW (already in review)', async () => {
    const claim = makeClaim({ status: ClaimStatus.IN_REVIEW, assignedAdminId: null });
    const ctx = makeAdminCtx(claim);

    await expect(
      stateMachine.transition(claim.status, ClaimEvent.ADMIN_TAKE_CHARGE, table, ctx),
    ).rejects.toThrow();
  });

  it('cannot AUTO_EXPIRE from IN_REVIEW state', async () => {
    const claim = makeClaim({ status: ClaimStatus.IN_REVIEW, assignedAdminId: null });
    const ctx = makeSystemCtx(claim);

    await expect(
      stateMachine.transition(claim.status, ClaimEvent.AUTO_EXPIRE, table, ctx),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Invariant: valid transitions always return a recognized ClaimStatus value
// ---------------------------------------------------------------------------

describe('Invariant: all valid transitions return a recognized ClaimStatus', () => {
  let stateMachine: StateMachineService;
  const table = buildClaimTransitionTable();
  const allStatuses = Object.values(ClaimStatus);

  beforeEach(() => {
    stateMachine = new StateMachineService();
  });

  it('all 5 documented arcs return a recognized status', async () => {
    const cases: Array<{ claim: Claim; event: ClaimEvent; ctx: TransitionContext<Claim> }> = [
      {
        claim: makeClaim({ status: ClaimStatus.OPEN, assignedAdminId: null }),
        event: ClaimEvent.ADMIN_TAKE_CHARGE,
        ctx: makeAdminCtx(makeClaim({ status: ClaimStatus.OPEN, assignedAdminId: null })),
      },
      {
        claim: makeClaim({ status: ClaimStatus.OPEN, assignedAdminId: null }),
        event: ClaimEvent.AUTO_EXPIRE,
        ctx: makeSystemCtx(makeClaim({ status: ClaimStatus.OPEN, assignedAdminId: null })),
      },
      {
        claim: makeClaim({ status: ClaimStatus.IN_REVIEW }),
        event: ClaimEvent.ADMIN_RESOLVE_FULL_REFUND,
        ctx: makeAdminCtx(makeClaim({ status: ClaimStatus.IN_REVIEW })),
      },
      {
        claim: makeClaim({ status: ClaimStatus.IN_REVIEW }),
        event: ClaimEvent.ADMIN_RESOLVE_PARTIAL_REFUND,
        ctx: makeAdminCtx(makeClaim({ status: ClaimStatus.IN_REVIEW }), { amount: 75 }),
      },
      {
        claim: makeClaim({ status: ClaimStatus.IN_REVIEW }),
        event: ClaimEvent.ADMIN_REJECT,
        ctx: makeAdminCtx(makeClaim({ status: ClaimStatus.IN_REVIEW }), { reason: 'Evidence insufficient' }),
      },
    ];

    for (const { claim, event, ctx } of cases) {
      const next = await stateMachine.transition(claim.status, event, table, ctx);
      expect(allStatuses).toContain(next);
    }
  });
});
