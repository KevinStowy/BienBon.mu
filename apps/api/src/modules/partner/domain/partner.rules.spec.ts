// =============================================================================
// Partner Domain Rules — unit tests (ADR-023 anti-trivialité)
// =============================================================================
// Strategy: each test verifies a behavioural invariant, not an implementation
// mirror. We systematically cover every status for every rule to catch any
// future regression when statuses are added or rule predicates are edited.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { PartnerStatus, RegistrationChannel } from '@bienbon/shared-types';
import type { Partner } from './partner.entity';
import {
  canValidate,
  canReject,
  canSuspend,
  canReactivate,
  canBan,
  canCancelRegistration,
  isActive,
} from './partner.rules';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makePartner(status: PartnerStatus): Partner {
  return {
    id: 'a1b2c3d4-0000-0000-0000-000000000001',
    userId: 'a1b2c3d4-0000-0000-0000-000000000002',
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

const ALL_STATUSES = Object.values(PartnerStatus);

// ---------------------------------------------------------------------------
// canValidate
// ---------------------------------------------------------------------------

describe('canValidate', () => {
  it('returns true for PENDING status', () => {
    expect(canValidate(makePartner(PartnerStatus.PENDING))).toBe(true);
  });

  it('returns true for REJECTED status (re-approval path)', () => {
    expect(canValidate(makePartner(PartnerStatus.REJECTED))).toBe(true);
  });

  it('returns false for ACTIVE status — already validated', () => {
    expect(canValidate(makePartner(PartnerStatus.ACTIVE))).toBe(false);
  });

  it('returns false for SUSPENDED status — suspend is reversible via reactivate, not validate', () => {
    expect(canValidate(makePartner(PartnerStatus.SUSPENDED))).toBe(false);
  });

  it('returns false for BANNED status — banned is a terminal state', () => {
    expect(canValidate(makePartner(PartnerStatus.BANNED))).toBe(false);
  });

  it('exactly PENDING and REJECTED are the only statuses that allow validation', () => {
    const allowedStatuses = ALL_STATUSES.filter((s) => canValidate(makePartner(s)));
    expect(allowedStatuses).toEqual(
      expect.arrayContaining([PartnerStatus.PENDING, PartnerStatus.REJECTED]),
    );
    expect(allowedStatuses).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// canReject
// ---------------------------------------------------------------------------

describe('canReject', () => {
  it('returns true for PENDING status', () => {
    expect(canReject(makePartner(PartnerStatus.PENDING))).toBe(true);
  });

  it('returns false for ACTIVE status — an active partner cannot be rejected', () => {
    expect(canReject(makePartner(PartnerStatus.ACTIVE))).toBe(false);
  });

  it('returns false for REJECTED status — already rejected', () => {
    expect(canReject(makePartner(PartnerStatus.REJECTED))).toBe(false);
  });

  it('returns false for SUSPENDED status', () => {
    expect(canReject(makePartner(PartnerStatus.SUSPENDED))).toBe(false);
  });

  it('returns false for BANNED status', () => {
    expect(canReject(makePartner(PartnerStatus.BANNED))).toBe(false);
  });

  it('exactly PENDING is the only status that allows rejection', () => {
    const allowedStatuses = ALL_STATUSES.filter((s) => canReject(makePartner(s)));
    expect(allowedStatuses).toEqual([PartnerStatus.PENDING]);
    expect(allowedStatuses).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// canSuspend
// ---------------------------------------------------------------------------

describe('canSuspend', () => {
  it('returns true for ACTIVE status', () => {
    expect(canSuspend(makePartner(PartnerStatus.ACTIVE))).toBe(true);
  });

  it('returns false for PENDING status', () => {
    expect(canSuspend(makePartner(PartnerStatus.PENDING))).toBe(false);
  });

  it('returns false for SUSPENDED status — already suspended, idempotency must be rejected', () => {
    expect(canSuspend(makePartner(PartnerStatus.SUSPENDED))).toBe(false);
  });

  it('returns false for REJECTED status', () => {
    expect(canSuspend(makePartner(PartnerStatus.REJECTED))).toBe(false);
  });

  it('returns false for BANNED status — banned is a terminal state', () => {
    expect(canSuspend(makePartner(PartnerStatus.BANNED))).toBe(false);
  });

  it('exactly ACTIVE is the only status that can be suspended', () => {
    const allowedStatuses = ALL_STATUSES.filter((s) => canSuspend(makePartner(s)));
    expect(allowedStatuses).toEqual([PartnerStatus.ACTIVE]);
    expect(allowedStatuses).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// canReactivate
// ---------------------------------------------------------------------------

describe('canReactivate', () => {
  it('returns true for SUSPENDED status', () => {
    expect(canReactivate(makePartner(PartnerStatus.SUSPENDED))).toBe(true);
  });

  it('returns false for ACTIVE status — already active, not suspended', () => {
    expect(canReactivate(makePartner(PartnerStatus.ACTIVE))).toBe(false);
  });

  it('returns false for PENDING status', () => {
    expect(canReactivate(makePartner(PartnerStatus.PENDING))).toBe(false);
  });

  it('returns false for REJECTED status', () => {
    expect(canReactivate(makePartner(PartnerStatus.REJECTED))).toBe(false);
  });

  it('returns false for BANNED status', () => {
    expect(canReactivate(makePartner(PartnerStatus.BANNED))).toBe(false);
  });

  it('exactly SUSPENDED is the only status that allows reactivation', () => {
    const allowedStatuses = ALL_STATUSES.filter((s) => canReactivate(makePartner(s)));
    expect(allowedStatuses).toEqual([PartnerStatus.SUSPENDED]);
    expect(allowedStatuses).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// canBan
// ---------------------------------------------------------------------------

describe('canBan', () => {
  it('returns true for ACTIVE status', () => {
    expect(canBan(makePartner(PartnerStatus.ACTIVE))).toBe(true);
  });

  it('returns true for SUSPENDED status — ban is escalation of suspension', () => {
    expect(canBan(makePartner(PartnerStatus.SUSPENDED))).toBe(true);
  });

  it('returns false for PENDING status — registration not yet approved', () => {
    expect(canBan(makePartner(PartnerStatus.PENDING))).toBe(false);
  });

  it('returns false for REJECTED status', () => {
    expect(canBan(makePartner(PartnerStatus.REJECTED))).toBe(false);
  });

  it('returns false for BANNED status — already in terminal ban state', () => {
    expect(canBan(makePartner(PartnerStatus.BANNED))).toBe(false);
  });

  it('exactly ACTIVE and SUSPENDED are the only statuses that allow banning', () => {
    const allowedStatuses = ALL_STATUSES.filter((s) => canBan(makePartner(s)));
    expect(allowedStatuses).toEqual(
      expect.arrayContaining([PartnerStatus.ACTIVE, PartnerStatus.SUSPENDED]),
    );
    expect(allowedStatuses).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// canCancelRegistration
// ---------------------------------------------------------------------------

describe('canCancelRegistration', () => {
  it('returns true for PENDING status — partner can withdraw before decision', () => {
    expect(canCancelRegistration(makePartner(PartnerStatus.PENDING))).toBe(true);
  });

  it('returns false for ACTIVE status — cannot cancel an approved registration', () => {
    expect(canCancelRegistration(makePartner(PartnerStatus.ACTIVE))).toBe(false);
  });

  it('returns false for REJECTED status — already processed', () => {
    expect(canCancelRegistration(makePartner(PartnerStatus.REJECTED))).toBe(false);
  });

  it('returns false for SUSPENDED status', () => {
    expect(canCancelRegistration(makePartner(PartnerStatus.SUSPENDED))).toBe(false);
  });

  it('returns false for BANNED status', () => {
    expect(canCancelRegistration(makePartner(PartnerStatus.BANNED))).toBe(false);
  });

  it('exactly PENDING is the only status allowing registration cancellation', () => {
    const allowedStatuses = ALL_STATUSES.filter((s) =>
      canCancelRegistration(makePartner(s)),
    );
    expect(allowedStatuses).toEqual([PartnerStatus.PENDING]);
    expect(allowedStatuses).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// isActive
// ---------------------------------------------------------------------------

describe('isActive', () => {
  it('returns true for ACTIVE status', () => {
    expect(isActive(makePartner(PartnerStatus.ACTIVE))).toBe(true);
  });

  it('returns false for PENDING status — pending partner cannot operate', () => {
    expect(isActive(makePartner(PartnerStatus.PENDING))).toBe(false);
  });

  it('returns false for SUSPENDED status — suspended partner cannot operate', () => {
    expect(isActive(makePartner(PartnerStatus.SUSPENDED))).toBe(false);
  });

  it('returns false for REJECTED status', () => {
    expect(isActive(makePartner(PartnerStatus.REJECTED))).toBe(false);
  });

  it('returns false for BANNED status', () => {
    expect(isActive(makePartner(PartnerStatus.BANNED))).toBe(false);
  });

  it('exactly ACTIVE is the only operational status', () => {
    const activeStatuses = ALL_STATUSES.filter((s) => isActive(makePartner(s)));
    expect(activeStatuses).toEqual([PartnerStatus.ACTIVE]);
    expect(activeStatuses).toHaveLength(1);
  });

  it('non-active status implies canSuspend/canBan/canReactivate rules are mutually exclusive with isActive for those states', () => {
    // Invariant: a partner that is not active cannot be suspended further
    const nonActive = ALL_STATUSES.filter((s) => !isActive(makePartner(s)));
    for (const status of nonActive) {
      if (status !== PartnerStatus.ACTIVE) {
        // Suspend requires ACTIVE; none of the non-active statuses should allow it
        // except ACTIVE itself (which is excluded from nonActive here)
        expect(canSuspend(makePartner(status))).toBe(false);
      }
    }
  });
});
