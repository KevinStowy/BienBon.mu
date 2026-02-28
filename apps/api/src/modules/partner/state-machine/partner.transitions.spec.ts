// =============================================================================
// Partner Transition Table — integration tests of state machine + domain guards
// (ADR-017, ADR-023)
// =============================================================================
// Tests exercise the full Partner transition table through the real
// StateMachineService. We use a mock EventEmitter2 (no external infra needed).
// Each of the 8 documented transitions (P1-P8) is tested for the happy path.
// Invalid transitions and guard failures are tested systematically.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { PartnerStatus, RegistrationChannel, DomainException } from '@bienbon/shared-types';
import { StateMachineService } from '../../../shared/state-machine/state-machine.service';
import type { TransitionContext } from '../../../shared/state-machine';
import type { Partner } from '../domain/partner.entity';
import { PartnerEvent } from './partner.states';
import { buildPartnerTransitionTable } from './partner.transitions';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePartner(status: PartnerStatus): Partner {
  return {
    id: 'partner-uuid-0000-0000-000000000001',
    userId: 'user-uuid-0000-0000-000000000002',
    status,
    statusReason: null,
    statusChangedAt: null,
    statusChangedBy: null,
    submittedAt: new Date('2025-01-01T00:00:00.000Z'),
    validatedAt: null,
    validatedBy: null,
    registrationChannel: RegistrationChannel.WEB_FORM,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  };
}

function makeCtx(
  status: PartnerStatus,
  overrides: Partial<TransitionContext<Partner>> = {},
): TransitionContext<Partner> {
  return {
    entity: makePartner(status),
    actorId: 'admin-uuid-0000-0000-000000000003',
    actorRole: 'admin',
    metadata: {},
    timestamp: new Date('2025-06-01T12:00:00.000Z'),
    ...overrides,
  };
}

function makeAdminCtxWithReason(
  status: PartnerStatus,
  reason: string,
): TransitionContext<Partner> {
  return makeCtx(status, { metadata: { reason } });
}

function makeBanCtx(
  status: PartnerStatus,
  reason: string,
  confirmed: boolean,
): TransitionContext<Partner> {
  return makeCtx(status, { metadata: { reason, confirmed } });
}

// ---------------------------------------------------------------------------
// Suite setup
// ---------------------------------------------------------------------------

describe('Partner Transition Table', () => {
  let service: StateMachineService;
  let mockEmitter: EventEmitter2;

  beforeEach(() => {
    service = new StateMachineService();
    mockEmitter = { emit: vi.fn() } as unknown as EventEmitter2;
  });

  // -------------------------------------------------------------------------
  // P1: PENDING → ADMIN_VALIDATE → ACTIVE
  // -------------------------------------------------------------------------

  describe('P1: PENDING + ADMIN_VALIDATE → ACTIVE', () => {
    it('transitions PENDING to ACTIVE when admin validates', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const ctx = makeCtx(PartnerStatus.PENDING);

      const result = await service.transition(
        PartnerStatus.PENDING,
        PartnerEvent.ADMIN_VALIDATE,
        table,
        ctx,
      );

      expect(result).toBe(PartnerStatus.ACTIVE);
    });

    it('emits a domain event when the transition succeeds', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const ctx = makeCtx(PartnerStatus.PENDING);

      await service.transition(PartnerStatus.PENDING, PartnerEvent.ADMIN_VALIDATE, table, ctx);

      expect(mockEmitter.emit).toHaveBeenCalled();
    });

    it('throws when actorRole is not admin', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const ctx = makeCtx(PartnerStatus.PENDING, { actorRole: 'consumer' });

      await expect(
        service.transition(PartnerStatus.PENDING, PartnerEvent.ADMIN_VALIDATE, table, ctx),
      ).rejects.toThrow(DomainException);
    });

    it('throws when actorRole is "partner"', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const ctx = makeCtx(PartnerStatus.PENDING, { actorRole: 'partner' });

      await expect(
        service.transition(PartnerStatus.PENDING, PartnerEvent.ADMIN_VALIDATE, table, ctx),
      ).rejects.toThrow(DomainException);
    });
  });

  // -------------------------------------------------------------------------
  // P2: PENDING → ADMIN_REJECT → REJECTED
  // -------------------------------------------------------------------------

  describe('P2: PENDING + ADMIN_REJECT → REJECTED', () => {
    it('transitions PENDING to REJECTED when admin rejects with a reason', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const ctx = makeAdminCtxWithReason(PartnerStatus.PENDING, 'Documents incomplets');

      const result = await service.transition(
        PartnerStatus.PENDING,
        PartnerEvent.ADMIN_REJECT,
        table,
        ctx,
      );

      expect(result).toBe(PartnerStatus.REJECTED);
    });

    it('throws when rejection reason is missing', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const ctx = makeCtx(PartnerStatus.PENDING, { metadata: {} });

      await expect(
        service.transition(PartnerStatus.PENDING, PartnerEvent.ADMIN_REJECT, table, ctx),
      ).rejects.toThrow(DomainException);
    });

    it('throws when rejection reason is empty string', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const ctx = makeAdminCtxWithReason(PartnerStatus.PENDING, '');

      await expect(
        service.transition(PartnerStatus.PENDING, PartnerEvent.ADMIN_REJECT, table, ctx),
      ).rejects.toThrow(DomainException);
    });

    it('throws when rejection reason is whitespace only', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const ctx = makeAdminCtxWithReason(PartnerStatus.PENDING, '   ');

      await expect(
        service.transition(PartnerStatus.PENDING, PartnerEvent.ADMIN_REJECT, table, ctx),
      ).rejects.toThrow(DomainException);
    });

    it('throws when actor is not admin', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const ctx = makeCtx(PartnerStatus.PENDING, {
        actorRole: 'consumer',
        metadata: { reason: 'Valid reason' },
      });

      await expect(
        service.transition(PartnerStatus.PENDING, PartnerEvent.ADMIN_REJECT, table, ctx),
      ).rejects.toThrow(DomainException);
    });
  });

  // -------------------------------------------------------------------------
  // P3: ACTIVE → ADMIN_SUSPEND → SUSPENDED
  // -------------------------------------------------------------------------

  describe('P3: ACTIVE + ADMIN_SUSPEND → SUSPENDED', () => {
    it('transitions ACTIVE to SUSPENDED with a reason', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const ctx = makeAdminCtxWithReason(PartnerStatus.ACTIVE, 'Plaintes multiples');

      const result = await service.transition(
        PartnerStatus.ACTIVE,
        PartnerEvent.ADMIN_SUSPEND,
        table,
        ctx,
      );

      expect(result).toBe(PartnerStatus.SUSPENDED);
    });

    it('throws when suspension reason is missing', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const ctx = makeCtx(PartnerStatus.ACTIVE, { metadata: {} });

      await expect(
        service.transition(PartnerStatus.ACTIVE, PartnerEvent.ADMIN_SUSPEND, table, ctx),
      ).rejects.toThrow(DomainException);
    });

    it('throws when actor is not admin', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const ctx = makeCtx(PartnerStatus.ACTIVE, {
        actorRole: 'partner',
        metadata: { reason: 'Raison valide' },
      });

      await expect(
        service.transition(PartnerStatus.ACTIVE, PartnerEvent.ADMIN_SUSPEND, table, ctx),
      ).rejects.toThrow(DomainException);
    });
  });

  // -------------------------------------------------------------------------
  // P4: SUSPENDED → ADMIN_REACTIVATE → ACTIVE
  // -------------------------------------------------------------------------

  describe('P4: SUSPENDED + ADMIN_REACTIVATE → ACTIVE', () => {
    it('transitions SUSPENDED to ACTIVE when admin reactivates', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const ctx = makeCtx(PartnerStatus.SUSPENDED);

      const result = await service.transition(
        PartnerStatus.SUSPENDED,
        PartnerEvent.ADMIN_REACTIVATE,
        table,
        ctx,
      );

      expect(result).toBe(PartnerStatus.ACTIVE);
    });

    it('throws when actor is not admin', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const ctx = makeCtx(PartnerStatus.SUSPENDED, { actorRole: 'system' });

      await expect(
        service.transition(PartnerStatus.SUSPENDED, PartnerEvent.ADMIN_REACTIVATE, table, ctx),
      ).rejects.toThrow(DomainException);
    });
  });

  // -------------------------------------------------------------------------
  // P5: ACTIVE → ADMIN_BAN → BANNED
  // -------------------------------------------------------------------------

  describe('P5: ACTIVE + ADMIN_BAN → BANNED', () => {
    it('transitions ACTIVE to BANNED with reason and confirmation', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const ctx = makeBanCtx(PartnerStatus.ACTIVE, 'Fraude avérée', true);

      const result = await service.transition(
        PartnerStatus.ACTIVE,
        PartnerEvent.ADMIN_BAN,
        table,
        ctx,
      );

      expect(result).toBe(PartnerStatus.BANNED);
    });

    it('throws when confirmed is false', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const ctx = makeBanCtx(PartnerStatus.ACTIVE, 'Fraude avérée', false);

      await expect(
        service.transition(PartnerStatus.ACTIVE, PartnerEvent.ADMIN_BAN, table, ctx),
      ).rejects.toThrow(DomainException);
    });

    it('throws when reason is missing even with confirmed=true', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const ctx = makeCtx(PartnerStatus.ACTIVE, { metadata: { confirmed: true } });

      await expect(
        service.transition(PartnerStatus.ACTIVE, PartnerEvent.ADMIN_BAN, table, ctx),
      ).rejects.toThrow(DomainException);
    });

    it('throws when actor is not admin', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const ctx = makeCtx(PartnerStatus.ACTIVE, {
        actorRole: 'consumer',
        metadata: { reason: 'Fraude', confirmed: true },
      });

      await expect(
        service.transition(PartnerStatus.ACTIVE, PartnerEvent.ADMIN_BAN, table, ctx),
      ).rejects.toThrow(DomainException);
    });
  });

  // -------------------------------------------------------------------------
  // P6: SUSPENDED → ADMIN_BAN → BANNED
  // -------------------------------------------------------------------------

  describe('P6: SUSPENDED + ADMIN_BAN → BANNED', () => {
    it('transitions SUSPENDED to BANNED — ban escalates suspension', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const ctx = makeBanCtx(PartnerStatus.SUSPENDED, 'Récidive après suspension', true);

      const result = await service.transition(
        PartnerStatus.SUSPENDED,
        PartnerEvent.ADMIN_BAN,
        table,
        ctx,
      );

      expect(result).toBe(PartnerStatus.BANNED);
    });

    it('throws when ban confirmation is missing for SUSPENDED partner', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const ctx = makeCtx(PartnerStatus.SUSPENDED, { metadata: { reason: 'Récidive' } });

      await expect(
        service.transition(PartnerStatus.SUSPENDED, PartnerEvent.ADMIN_BAN, table, ctx),
      ).rejects.toThrow(DomainException);
    });
  });

  // -------------------------------------------------------------------------
  // P7: REJECTED → ADMIN_VALIDATE → ACTIVE
  // -------------------------------------------------------------------------

  describe('P7: REJECTED + ADMIN_VALIDATE → ACTIVE', () => {
    it('transitions REJECTED to ACTIVE — second-chance validation', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const ctx = makeCtx(PartnerStatus.REJECTED);

      const result = await service.transition(
        PartnerStatus.REJECTED,
        PartnerEvent.ADMIN_VALIDATE,
        table,
        ctx,
      );

      expect(result).toBe(PartnerStatus.ACTIVE);
    });

    it('throws when actor is not admin for REJECTED → ACTIVE', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const ctx = makeCtx(PartnerStatus.REJECTED, { actorRole: 'partner' });

      await expect(
        service.transition(PartnerStatus.REJECTED, PartnerEvent.ADMIN_VALIDATE, table, ctx),
      ).rejects.toThrow(DomainException);
    });
  });

  // -------------------------------------------------------------------------
  // P8: PENDING → PARTNER_CANCEL → REJECTED (terminal state for registration)
  // -------------------------------------------------------------------------

  describe('P8: PENDING + PARTNER_CANCEL → REJECTED', () => {
    it('transitions PENDING to REJECTED when partner cancels their own registration', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const ctx = makeCtx(PartnerStatus.PENDING, { actorRole: 'partner' });

      const result = await service.transition(
        PartnerStatus.PENDING,
        PartnerEvent.PARTNER_CANCEL,
        table,
        ctx,
      );

      expect(result).toBe(PartnerStatus.REJECTED);
    });

    it('allows any actorRole for PARTNER_CANCEL — no guardAdminOnly', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);

      // A consumer-role actor should also succeed here (no admin guard on this transition)
      const ctx = makeCtx(PartnerStatus.PENDING, { actorRole: 'consumer' });

      const result = await service.transition(
        PartnerStatus.PENDING,
        PartnerEvent.PARTNER_CANCEL,
        table,
        ctx,
      );

      expect(result).toBe(PartnerStatus.REJECTED);
    });
  });

  // -------------------------------------------------------------------------
  // BANNED — terminal state: all events throw
  // -------------------------------------------------------------------------

  describe('BANNED is a terminal state', () => {
    it('throws for ADMIN_VALIDATE event from BANNED', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const ctx = makeCtx(PartnerStatus.BANNED);

      await expect(
        service.transition(PartnerStatus.BANNED, PartnerEvent.ADMIN_VALIDATE, table, ctx),
      ).rejects.toThrow(DomainException);
    });

    it('throws for ADMIN_REJECT event from BANNED', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const ctx = makeAdminCtxWithReason(PartnerStatus.BANNED, 'Any reason');

      await expect(
        service.transition(PartnerStatus.BANNED, PartnerEvent.ADMIN_REJECT, table, ctx),
      ).rejects.toThrow(DomainException);
    });

    it('throws for ADMIN_SUSPEND event from BANNED', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const ctx = makeAdminCtxWithReason(PartnerStatus.BANNED, 'Any reason');

      await expect(
        service.transition(PartnerStatus.BANNED, PartnerEvent.ADMIN_SUSPEND, table, ctx),
      ).rejects.toThrow(DomainException);
    });

    it('throws for ADMIN_REACTIVATE event from BANNED', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const ctx = makeCtx(PartnerStatus.BANNED);

      await expect(
        service.transition(PartnerStatus.BANNED, PartnerEvent.ADMIN_REACTIVATE, table, ctx),
      ).rejects.toThrow(DomainException);
    });

    it('throws for ADMIN_BAN event from BANNED — already banned', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const ctx = makeBanCtx(PartnerStatus.BANNED, 'Already banned', true);

      await expect(
        service.transition(PartnerStatus.BANNED, PartnerEvent.ADMIN_BAN, table, ctx),
      ).rejects.toThrow(DomainException);
    });

    it('throws for PARTNER_CANCEL event from BANNED', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const ctx = makeCtx(PartnerStatus.BANNED, { actorRole: 'partner' });

      await expect(
        service.transition(PartnerStatus.BANNED, PartnerEvent.PARTNER_CANCEL, table, ctx),
      ).rejects.toThrow(DomainException);
    });
  });

  // -------------------------------------------------------------------------
  // Invalid transitions — events not defined for states
  // -------------------------------------------------------------------------

  describe('invalid transitions not in the transition table', () => {
    it('throws when applying ADMIN_SUSPEND to a PENDING partner', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const ctx = makeAdminCtxWithReason(PartnerStatus.PENDING, 'Reason');

      await expect(
        service.transition(PartnerStatus.PENDING, PartnerEvent.ADMIN_SUSPEND, table, ctx),
      ).rejects.toThrow(DomainException);
    });

    it('throws when applying ADMIN_REACTIVATE to an ACTIVE partner', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const ctx = makeCtx(PartnerStatus.ACTIVE);

      await expect(
        service.transition(PartnerStatus.ACTIVE, PartnerEvent.ADMIN_REACTIVATE, table, ctx),
      ).rejects.toThrow(DomainException);
    });

    it('throws when applying ADMIN_VALIDATE to an ACTIVE partner — already active', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const ctx = makeCtx(PartnerStatus.ACTIVE);

      await expect(
        service.transition(PartnerStatus.ACTIVE, PartnerEvent.ADMIN_VALIDATE, table, ctx),
      ).rejects.toThrow(DomainException);
    });

    it('throws when applying ADMIN_REJECT to a SUSPENDED partner', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const ctx = makeAdminCtxWithReason(PartnerStatus.SUSPENDED, 'Reason');

      await expect(
        service.transition(PartnerStatus.SUSPENDED, PartnerEvent.ADMIN_REJECT, table, ctx),
      ).rejects.toThrow(DomainException);
    });

    it('throws when applying PARTNER_CANCEL to an ACTIVE partner', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const ctx = makeCtx(PartnerStatus.ACTIVE, { actorRole: 'partner' });

      await expect(
        service.transition(PartnerStatus.ACTIVE, PartnerEvent.PARTNER_CANCEL, table, ctx),
      ).rejects.toThrow(DomainException);
    });

    it('throws when applying PARTNER_CANCEL to a REJECTED partner — already processed', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const ctx = makeCtx(PartnerStatus.REJECTED, { actorRole: 'partner' });

      await expect(
        service.transition(PartnerStatus.REJECTED, PartnerEvent.PARTNER_CANCEL, table, ctx),
      ).rejects.toThrow(DomainException);
    });
  });

  // -------------------------------------------------------------------------
  // Invariant: target state is always a valid PartnerStatus value
  // -------------------------------------------------------------------------

  describe('state machine invariants', () => {
    it('all valid transitions return a recognized PartnerStatus value', async () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const allPartnerStatuses = Object.values(PartnerStatus);

      const validTransitions: Array<{
        from: PartnerStatus;
        event: PartnerEvent;
        ctx: TransitionContext<Partner>;
      }> = [
        { from: PartnerStatus.PENDING, event: PartnerEvent.ADMIN_VALIDATE, ctx: makeCtx(PartnerStatus.PENDING) },
        { from: PartnerStatus.PENDING, event: PartnerEvent.ADMIN_REJECT, ctx: makeAdminCtxWithReason(PartnerStatus.PENDING, 'Docs manquants') },
        { from: PartnerStatus.PENDING, event: PartnerEvent.PARTNER_CANCEL, ctx: makeCtx(PartnerStatus.PENDING, { actorRole: 'partner' }) },
        { from: PartnerStatus.ACTIVE, event: PartnerEvent.ADMIN_SUSPEND, ctx: makeAdminCtxWithReason(PartnerStatus.ACTIVE, 'Plainte') },
        { from: PartnerStatus.ACTIVE, event: PartnerEvent.ADMIN_BAN, ctx: makeBanCtx(PartnerStatus.ACTIVE, 'Fraude', true) },
        { from: PartnerStatus.SUSPENDED, event: PartnerEvent.ADMIN_REACTIVATE, ctx: makeCtx(PartnerStatus.SUSPENDED) },
        { from: PartnerStatus.SUSPENDED, event: PartnerEvent.ADMIN_BAN, ctx: makeBanCtx(PartnerStatus.SUSPENDED, 'Récidive', true) },
        { from: PartnerStatus.REJECTED, event: PartnerEvent.ADMIN_VALIDATE, ctx: makeCtx(PartnerStatus.REJECTED) },
      ];

      for (const { from, event, ctx } of validTransitions) {
        const result = await service.transition(from, event, table, ctx);
        expect(allPartnerStatuses).toContain(result);
      }
    });

    it('BANNED state has no outgoing transitions — it is truly terminal', () => {
      const table = buildPartnerTransitionTable(mockEmitter);
      const bannedTransitions = table[PartnerStatus.BANNED];

      expect(bannedTransitions).toBeDefined();
      expect(Object.keys(bannedTransitions!)).toHaveLength(0);
    });
  });
});
