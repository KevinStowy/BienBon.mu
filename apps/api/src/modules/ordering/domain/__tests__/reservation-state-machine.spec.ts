// =============================================================================
// Reservation State Machine — exhaustive transition tests (ADR-017, ADR-023)
// =============================================================================
// Tests the pure `transition()` function against every documented arc in the
// ADR-017 state diagram, then systematically confirms that every OTHER arc
// throws.  Property: terminal states have no outgoing transitions.
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  transition,
  ReservationEvent,
  getValidEvents,
} from '../rules/reservation-state-machine';
import { ReservationStatus, TERMINAL_STATUSES } from '../enums/reservation-status.enum';
import { InvalidReservationTransitionError } from '../errors/ordering-errors';

// ---------------------------------------------------------------------------
// Documented transitions (happy path — one test per ADR-017 arc)
// ---------------------------------------------------------------------------

describe('Valid reservation state machine transitions', () => {
  describe('PENDING_PAYMENT + PAYMENT_SUCCESS -> CONFIRMED', () => {
    it('transitions to CONFIRMED when payment succeeds', () => {
      const next = transition(
        ReservationStatus.PENDING_PAYMENT,
        ReservationEvent.PAYMENT_SUCCESS,
      );
      expect(next).toBe(ReservationStatus.CONFIRMED);
    });
  });

  describe('PENDING_PAYMENT + PAYMENT_FAILED -> EXPIRED', () => {
    it('transitions to EXPIRED when payment fails', () => {
      const next = transition(
        ReservationStatus.PENDING_PAYMENT,
        ReservationEvent.PAYMENT_FAILED,
      );
      expect(next).toBe(ReservationStatus.EXPIRED);
    });
  });

  describe('PENDING_PAYMENT + HOLD_TIMEOUT -> EXPIRED', () => {
    it('transitions to EXPIRED on hold timeout (5-minute window)', () => {
      const next = transition(
        ReservationStatus.PENDING_PAYMENT,
        ReservationEvent.HOLD_TIMEOUT,
      );
      expect(next).toBe(ReservationStatus.EXPIRED);
    });
  });

  describe('CONFIRMED + CONSUMER_CANCEL -> CANCELLED_CONSUMER', () => {
    it('transitions to CANCELLED_CONSUMER when consumer cancels', () => {
      const next = transition(
        ReservationStatus.CONFIRMED,
        ReservationEvent.CONSUMER_CANCEL,
      );
      expect(next).toBe(ReservationStatus.CANCELLED_CONSUMER);
    });
  });

  describe('CONFIRMED + PARTNER_CANCEL -> CANCELLED_PARTNER', () => {
    it('transitions to CANCELLED_PARTNER when partner cancels', () => {
      const next = transition(
        ReservationStatus.CONFIRMED,
        ReservationEvent.PARTNER_CANCEL,
      );
      expect(next).toBe(ReservationStatus.CANCELLED_PARTNER);
    });
  });

  describe('CONFIRMED + PICKUP_WINDOW_START -> READY', () => {
    it('transitions to READY when partner opens the pickup window', () => {
      const next = transition(
        ReservationStatus.CONFIRMED,
        ReservationEvent.PICKUP_WINDOW_START,
      );
      expect(next).toBe(ReservationStatus.READY);
    });
  });

  describe('READY + QR_VALIDATED -> PICKED_UP', () => {
    it('transitions to PICKED_UP on successful QR/PIN validation', () => {
      const next = transition(
        ReservationStatus.READY,
        ReservationEvent.QR_VALIDATED,
      );
      expect(next).toBe(ReservationStatus.PICKED_UP);
    });
  });

  describe('READY + NO_SHOW_TIMEOUT -> NO_SHOW', () => {
    it('transitions to NO_SHOW when consumer never shows up', () => {
      const next = transition(
        ReservationStatus.READY,
        ReservationEvent.NO_SHOW_TIMEOUT,
      );
      expect(next).toBe(ReservationStatus.NO_SHOW);
    });
  });

  describe('READY + PARTNER_CANCEL -> CANCELLED_PARTNER', () => {
    it('transitions to CANCELLED_PARTNER when partner cancels a ready reservation', () => {
      const next = transition(
        ReservationStatus.READY,
        ReservationEvent.PARTNER_CANCEL,
      );
      expect(next).toBe(ReservationStatus.CANCELLED_PARTNER);
    });
  });
});

// ---------------------------------------------------------------------------
// Terminal states — no transitions must be allowed out
// ---------------------------------------------------------------------------

describe('Terminal states have no outgoing transitions', () => {
  const terminalStatuses = Array.from(TERMINAL_STATUSES);

  for (const status of terminalStatuses) {
    describe(`${status} is terminal`, () => {
      it('returns an empty list of valid events', () => {
        const events = getValidEvents(status);
        expect(events).toHaveLength(0);
      });

      it('throws for every ReservationEvent', () => {
        for (const event of Object.values(ReservationEvent)) {
          expect(() => transition(status, event)).toThrow(
            InvalidReservationTransitionError,
          );
        }
      });
    });
  }
});

// ---------------------------------------------------------------------------
// Invalid transitions — events that are not valid for a given state
// ---------------------------------------------------------------------------

describe('Invalid transitions throw InvalidReservationTransitionError', () => {
  const invalidCases: Array<[ReservationStatus, ReservationEvent]> = [
    // PENDING_PAYMENT cannot accept CONSUMER_CANCEL (no guard yet — payment not done)
    [ReservationStatus.PENDING_PAYMENT, ReservationEvent.CONSUMER_CANCEL],
    [ReservationStatus.PENDING_PAYMENT, ReservationEvent.PARTNER_CANCEL],
    [ReservationStatus.PENDING_PAYMENT, ReservationEvent.PICKUP_WINDOW_START],
    [ReservationStatus.PENDING_PAYMENT, ReservationEvent.QR_VALIDATED],
    [ReservationStatus.PENDING_PAYMENT, ReservationEvent.NO_SHOW_TIMEOUT],
    // CONFIRMED cannot be QR-validated directly (must go through READY first)
    [ReservationStatus.CONFIRMED, ReservationEvent.QR_VALIDATED],
    [ReservationStatus.CONFIRMED, ReservationEvent.NO_SHOW_TIMEOUT],
    [ReservationStatus.CONFIRMED, ReservationEvent.PAYMENT_SUCCESS],
    [ReservationStatus.CONFIRMED, ReservationEvent.PAYMENT_FAILED],
    [ReservationStatus.CONFIRMED, ReservationEvent.HOLD_TIMEOUT],
    // READY cannot be re-confirmed or payment-reverted
    [ReservationStatus.READY, ReservationEvent.PAYMENT_SUCCESS],
    [ReservationStatus.READY, ReservationEvent.PAYMENT_FAILED],
    [ReservationStatus.READY, ReservationEvent.HOLD_TIMEOUT],
    [ReservationStatus.READY, ReservationEvent.CONSUMER_CANCEL],
    [ReservationStatus.READY, ReservationEvent.PICKUP_WINDOW_START],
  ];

  for (const [status, event] of invalidCases) {
    it(`throws for ${status} + ${event}`, () => {
      expect(() => transition(status, event)).toThrow(
        InvalidReservationTransitionError,
      );
    });
  }
});

// ---------------------------------------------------------------------------
// Invariant: the returned state is always a recognized ReservationStatus value
// ---------------------------------------------------------------------------

describe('State machine invariant: all valid transitions return a recognized status', () => {
  const allStatuses = Object.values(ReservationStatus);

  it('covers all documented valid transitions and returns a recognized status', () => {
    const validCases: Array<[ReservationStatus, ReservationEvent]> = [
      [ReservationStatus.PENDING_PAYMENT, ReservationEvent.PAYMENT_SUCCESS],
      [ReservationStatus.PENDING_PAYMENT, ReservationEvent.PAYMENT_FAILED],
      [ReservationStatus.PENDING_PAYMENT, ReservationEvent.HOLD_TIMEOUT],
      [ReservationStatus.CONFIRMED, ReservationEvent.CONSUMER_CANCEL],
      [ReservationStatus.CONFIRMED, ReservationEvent.PARTNER_CANCEL],
      [ReservationStatus.CONFIRMED, ReservationEvent.PICKUP_WINDOW_START],
      [ReservationStatus.READY, ReservationEvent.QR_VALIDATED],
      [ReservationStatus.READY, ReservationEvent.NO_SHOW_TIMEOUT],
      [ReservationStatus.READY, ReservationEvent.PARTNER_CANCEL],
    ];

    for (const [status, event] of validCases) {
      const next = transition(status, event);
      expect(allStatuses).toContain(next);
    }
  });
});

// ---------------------------------------------------------------------------
// Error message quality — the error should include both from-state and event
// ---------------------------------------------------------------------------

describe('Error messages include context for debugging', () => {
  it('error message contains the source status', () => {
    let error: unknown;
    try {
      transition(ReservationStatus.PICKED_UP, ReservationEvent.PAYMENT_SUCCESS);
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(InvalidReservationTransitionError);
    expect((error as Error).message).toContain('PICKED_UP');
  });

  it('error message contains the attempted event', () => {
    let error: unknown;
    try {
      transition(ReservationStatus.CONFIRMED, ReservationEvent.QR_VALIDATED);
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(InvalidReservationTransitionError);
    expect((error as Error).message).toContain('QR_VALIDATED');
  });
});
