// =============================================================================
// StateMachineService — unit tests (ADR-017, ADR-023)
// =============================================================================
// The service is a generic engine: tests use a simple toy state machine
// (A/B/C states, GO/BACK events) so tests remain independent from any
// domain-specific transition table. Domain-specific tests live in the
// partner.transitions.spec.ts file.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DomainException } from '@bienbon/shared-types';
import { StateMachineService } from './state-machine.service';
import type { TransitionContext, TransitionTable } from './state-machine.types';

// ---------------------------------------------------------------------------
// Toy state machine — three states, two events
// ---------------------------------------------------------------------------

type TestState = 'A' | 'B' | 'C';
type TestEvent = 'GO' | 'BACK' | 'LOOP';

interface TestEntity {
  id: string;
}

function makeCtx(overrides: Partial<TransitionContext<TestEntity>> = {}): TransitionContext<TestEntity> {
  return {
    entity: { id: 'entity-001' },
    actorId: 'actor-001',
    actorRole: 'admin',
    metadata: {},
    timestamp: new Date('2025-06-01T12:00:00.000Z'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Shared service instance
// ---------------------------------------------------------------------------

describe('StateMachineService', () => {
  let service: StateMachineService;

  beforeEach(() => {
    service = new StateMachineService();
  });

  // -------------------------------------------------------------------------
  // Happy path: valid transition returns the correct target state
  // -------------------------------------------------------------------------

  describe('valid transition', () => {
    it('returns the target state for a valid event', async () => {
      const table: TransitionTable<TestState, TestEvent, TestEntity> = {
        A: {
          GO: {
            target: 'B',
            guards: [],
            effects: [],
            description: 'A -> B',
          },
        },
      };

      const result = await service.transition('A', 'GO', table, makeCtx());
      expect(result).toBe('B');
    });

    it('transitions through a chain: A→B then B→C', async () => {
      const table: TransitionTable<TestState, TestEvent, TestEntity> = {
        A: {
          GO: { target: 'B', guards: [], effects: [], description: 'A to B' },
        },
        B: {
          GO: { target: 'C', guards: [], effects: [], description: 'B to C' },
        },
      };

      const first = await service.transition('A', 'GO', table, makeCtx());
      expect(first).toBe('B');

      const second = await service.transition('B', 'GO', table, makeCtx());
      expect(second).toBe('C');
    });

    it('returns the target state even when guards and effects arrays are absent', async () => {
      const table: TransitionTable<TestState, TestEvent, TestEntity> = {
        A: {
          GO: {
            target: 'B',
            description: 'no guards no effects',
          },
        },
      };

      const result = await service.transition('A', 'GO', table, makeCtx());
      expect(result).toBe('B');
    });
  });

  // -------------------------------------------------------------------------
  // Guard evaluation
  // -------------------------------------------------------------------------

  describe('guards', () => {
    it('proceeds when all guards return true', async () => {
      const guard1 = vi.fn().mockReturnValue(true);
      const guard2 = vi.fn().mockReturnValue(true);

      const table: TransitionTable<TestState, TestEvent, TestEntity> = {
        A: {
          GO: { target: 'B', guards: [guard1, guard2], effects: [], description: 'guarded' },
        },
      };

      const result = await service.transition('A', 'GO', table, makeCtx());
      expect(result).toBe('B');
      expect(guard1).toHaveBeenCalledOnce();
      expect(guard2).toHaveBeenCalledOnce();
    });

    it('throws DomainException when the first guard fails', async () => {
      const failingGuard = vi.fn().mockReturnValue(false);
      const secondGuard = vi.fn().mockReturnValue(true);

      const table: TransitionTable<TestState, TestEvent, TestEntity> = {
        A: {
          GO: { target: 'B', guards: [failingGuard, secondGuard], effects: [], description: 'guarded' },
        },
      };

      await expect(service.transition('A', 'GO', table, makeCtx())).rejects.toThrow(
        DomainException,
      );
    });

    it('short-circuits on the first failing guard and does not run subsequent guards', async () => {
      const failingGuard = vi.fn().mockReturnValue(false);
      const neverCalledGuard = vi.fn().mockReturnValue(true);

      const table: TransitionTable<TestState, TestEvent, TestEntity> = {
        A: {
          GO: {
            target: 'B',
            guards: [failingGuard, neverCalledGuard],
            effects: [],
            description: 'short circuit',
          },
        },
      };

      await expect(service.transition('A', 'GO', table, makeCtx())).rejects.toThrow(
        DomainException,
      );

      expect(failingGuard).toHaveBeenCalledOnce();
      expect(neverCalledGuard).not.toHaveBeenCalled();
    });

    it('supports async guards that resolve to true', async () => {
      const asyncGuard = vi.fn().mockResolvedValue(true);

      const table: TransitionTable<TestState, TestEvent, TestEntity> = {
        A: {
          GO: { target: 'B', guards: [asyncGuard], effects: [], description: 'async guard' },
        },
      };

      const result = await service.transition('A', 'GO', table, makeCtx());
      expect(result).toBe('B');
    });

    it('throws DomainException when an async guard resolves to false', async () => {
      const asyncGuard = vi.fn().mockResolvedValue(false);

      const table: TransitionTable<TestState, TestEvent, TestEntity> = {
        A: {
          GO: { target: 'B', guards: [asyncGuard], effects: [], description: 'async guard fail' },
        },
      };

      await expect(service.transition('A', 'GO', table, makeCtx())).rejects.toThrow(
        DomainException,
      );
    });

    it('passes the full TransitionContext to each guard', async () => {
      const capturedCtxs: TransitionContext<TestEntity>[] = [];
      const guardCapture = vi.fn((ctx: TransitionContext<TestEntity>) => {
        capturedCtxs.push(ctx);
        return true;
      });

      const ctx = makeCtx({ actorId: 'specific-actor', actorRole: 'partner' });

      const table: TransitionTable<TestState, TestEvent, TestEntity> = {
        A: {
          GO: { target: 'B', guards: [guardCapture], effects: [], description: 'ctx capture' },
        },
      };

      await service.transition('A', 'GO', table, ctx);

      expect(capturedCtxs[0]).toMatchObject({
        actorId: 'specific-actor',
        actorRole: 'partner',
      });
    });
  });

  // -------------------------------------------------------------------------
  // Effect execution
  // -------------------------------------------------------------------------

  describe('effects', () => {
    it('runs all effects on a successful transition', async () => {
      const effect1 = vi.fn().mockResolvedValue(undefined);
      const effect2 = vi.fn().mockResolvedValue(undefined);

      const table: TransitionTable<TestState, TestEvent, TestEntity> = {
        A: {
          GO: { target: 'B', guards: [], effects: [effect1, effect2], description: 'effects' },
        },
      };

      await service.transition('A', 'GO', table, makeCtx());

      expect(effect1).toHaveBeenCalledOnce();
      expect(effect2).toHaveBeenCalledOnce();
    });

    it('continues running subsequent effects when one effect throws', async () => {
      const throwingEffect = vi.fn().mockRejectedValue(new Error('side-effect failed'));
      const continuingEffect = vi.fn().mockResolvedValue(undefined);

      const table: TransitionTable<TestState, TestEvent, TestEntity> = {
        A: {
          GO: {
            target: 'B',
            guards: [],
            effects: [throwingEffect, continuingEffect],
            description: 'resilient effects',
          },
        },
      };

      // The transition itself should NOT throw even though an effect failed
      const result = await service.transition('A', 'GO', table, makeCtx());

      expect(result).toBe('B');
      expect(throwingEffect).toHaveBeenCalledOnce();
      expect(continuingEffect).toHaveBeenCalledOnce();
    });

    it('returns the target state even when all effects fail', async () => {
      const failEffect1 = vi.fn().mockRejectedValue(new Error('effect 1 failed'));
      const failEffect2 = vi.fn().mockRejectedValue(new Error('effect 2 failed'));

      const table: TransitionTable<TestState, TestEvent, TestEntity> = {
        A: {
          GO: {
            target: 'B',
            guards: [],
            effects: [failEffect1, failEffect2],
            description: 'all effects fail',
          },
        },
      };

      const result = await service.transition('A', 'GO', table, makeCtx());
      expect(result).toBe('B');
    });

    it('does not run effects when a guard fails', async () => {
      const failingGuard = vi.fn().mockReturnValue(false);
      const effect = vi.fn().mockResolvedValue(undefined);

      const table: TransitionTable<TestState, TestEvent, TestEntity> = {
        A: {
          GO: {
            target: 'B',
            guards: [failingGuard],
            effects: [effect],
            description: 'guard blocks effects',
          },
        },
      };

      await expect(service.transition('A', 'GO', table, makeCtx())).rejects.toThrow(
        DomainException,
      );

      expect(effect).not.toHaveBeenCalled();
    });

    it('passes the TransitionContext to each effect', async () => {
      const capturedCtxs: TransitionContext<TestEntity>[] = [];
      const capturingEffect = vi.fn(async (ctx: TransitionContext<TestEntity>) => {
        capturedCtxs.push(ctx);
      });

      const ctx = makeCtx({ actorId: 'effect-actor' });

      const table: TransitionTable<TestState, TestEvent, TestEntity> = {
        A: {
          GO: { target: 'B', guards: [], effects: [capturingEffect], description: 'ctx in effect' },
        },
      };

      await service.transition('A', 'GO', table, ctx);

      expect(capturedCtxs[0]).toMatchObject({ actorId: 'effect-actor' });
    });
  });

  // -------------------------------------------------------------------------
  // Invalid transitions: state not in table
  // -------------------------------------------------------------------------

  describe('invalid state — no transitions defined', () => {
    it('throws DomainException when current state has no transitions in the table', async () => {
      const table: TransitionTable<TestState, TestEvent, TestEntity> = {
        A: {
          GO: { target: 'B', guards: [], effects: [], description: 'only A defined' },
        },
        // B and C not in table
      };

      await expect(service.transition('C', 'GO', table, makeCtx())).rejects.toThrow(
        DomainException,
      );
    });

    it('throws DomainException when the table is empty', async () => {
      const table: TransitionTable<TestState, TestEvent, TestEntity> = {};

      await expect(service.transition('A', 'GO', table, makeCtx())).rejects.toThrow(
        DomainException,
      );
    });

    it('DomainException message references the current state when state is missing', async () => {
      const table: TransitionTable<TestState, TestEvent, TestEntity> = {};

      await expect(service.transition('B', 'GO', table, makeCtx())).rejects.toThrow(
        /No transitions defined for state "B"/,
      );
    });
  });

  // -------------------------------------------------------------------------
  // Invalid transitions: event not allowed from current state
  // -------------------------------------------------------------------------

  describe('invalid event — event not allowed from current state', () => {
    it('throws DomainException when the event is not defined for the current state', async () => {
      const table: TransitionTable<TestState, TestEvent, TestEntity> = {
        A: {
          GO: { target: 'B', guards: [], effects: [], description: 'only GO defined' },
        },
      };

      await expect(service.transition('A', 'BACK', table, makeCtx())).rejects.toThrow(
        DomainException,
      );
    });

    it('DomainException message references both the event and the state when event is disallowed', async () => {
      const table: TransitionTable<TestState, TestEvent, TestEntity> = {
        A: {
          GO: { target: 'B', guards: [], effects: [], description: 'only GO defined' },
        },
      };

      await expect(service.transition('A', 'BACK', table, makeCtx())).rejects.toThrow(
        /"BACK".*"A"|"A".*"BACK"/,
      );
    });

    it('a state with an empty events object is treated as a terminal state — all events throw', async () => {
      const table: TransitionTable<TestState, TestEvent, TestEntity> = {
        A: {
          GO: { target: 'B', guards: [], effects: [], description: 'A to B' },
        },
        C: {},
      };

      await expect(service.transition('C', 'GO', table, makeCtx())).rejects.toThrow(
        DomainException,
      );
    });
  });
});
