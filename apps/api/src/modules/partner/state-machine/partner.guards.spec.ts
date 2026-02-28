// =============================================================================
// Partner State Machine Guards — unit tests (ADR-023, ADR-017)
// =============================================================================
// Guards are pure predicates: they receive a TransitionContext and return a
// boolean. Tests verify each guard against the full matrix of relevant inputs,
// including boundary values, whitespace-only strings, and missing metadata.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { PartnerStatus, RegistrationChannel } from '@bienbon/shared-types';
import type { TransitionContext } from '../../../shared/state-machine';
import type { Partner } from '../domain/partner.entity';
import {
  guardAdminOnly,
  guardRejectionReasonRequired,
  guardSuspensionReasonRequired,
  guardBanRequired,
} from './partner.guards';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePartner(status: PartnerStatus = PartnerStatus.PENDING): Partner {
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

function makeContext(
  overrides: Partial<TransitionContext<Partner>> = {},
): TransitionContext<Partner> {
  return {
    entity: makePartner(),
    actorId: 'actor-uuid-0000-0000-000000000001',
    actorRole: 'admin',
    metadata: {},
    timestamp: new Date('2025-06-01T12:00:00.000Z'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// guardAdminOnly
// ---------------------------------------------------------------------------

describe('guardAdminOnly', () => {
  it('returns true when actorRole is "admin"', () => {
    const ctx = makeContext({ actorRole: 'admin' });
    expect(guardAdminOnly(ctx)).toBe(true);
  });

  it('returns false when actorRole is "consumer"', () => {
    const ctx = makeContext({ actorRole: 'consumer' });
    expect(guardAdminOnly(ctx)).toBe(false);
  });

  it('returns false when actorRole is "partner"', () => {
    const ctx = makeContext({ actorRole: 'partner' });
    expect(guardAdminOnly(ctx)).toBe(false);
  });

  it('returns false when actorRole is "system"', () => {
    const ctx = makeContext({ actorRole: 'system' });
    expect(guardAdminOnly(ctx)).toBe(false);
  });

  it('is strict: only "admin" passes, not any other string', () => {
    const nonAdminRoles: Array<TransitionContext<Partner>['actorRole']> = [
      'consumer',
      'partner',
      'system',
    ];
    for (const role of nonAdminRoles) {
      expect(guardAdminOnly(makeContext({ actorRole: role }))).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// guardRejectionReasonRequired
// ---------------------------------------------------------------------------

describe('guardRejectionReasonRequired', () => {
  it('returns true when metadata.reason is a non-empty string', () => {
    const ctx = makeContext({ metadata: { reason: 'Documents falsifiés' } });
    expect(guardRejectionReasonRequired(ctx)).toBe(true);
  });

  it('returns true when metadata.reason contains only internal spaces but is not blank', () => {
    const ctx = makeContext({ metadata: { reason: 'a b' } });
    expect(guardRejectionReasonRequired(ctx)).toBe(true);
  });

  it('returns false when metadata.reason is an empty string', () => {
    const ctx = makeContext({ metadata: { reason: '' } });
    expect(guardRejectionReasonRequired(ctx)).toBe(false);
  });

  it('returns false when metadata.reason is whitespace only', () => {
    const ctx = makeContext({ metadata: { reason: '   ' } });
    expect(guardRejectionReasonRequired(ctx)).toBe(false);
  });

  it('returns false when metadata.reason is null', () => {
    const ctx = makeContext({ metadata: { reason: null } });
    expect(guardRejectionReasonRequired(ctx)).toBe(false);
  });

  it('returns false when metadata.reason is undefined', () => {
    const ctx = makeContext({ metadata: { reason: undefined } });
    expect(guardRejectionReasonRequired(ctx)).toBe(false);
  });

  it('returns false when metadata is undefined entirely', () => {
    const ctx = makeContext({ metadata: undefined });
    expect(guardRejectionReasonRequired(ctx)).toBe(false);
  });

  it('returns false when metadata.reason is a number, not a string', () => {
    const ctx = makeContext({ metadata: { reason: 42 } });
    expect(guardRejectionReasonRequired(ctx)).toBe(false);
  });

  it('returns false when metadata.reason is a boolean', () => {
    const ctx = makeContext({ metadata: { reason: true } });
    expect(guardRejectionReasonRequired(ctx)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// guardSuspensionReasonRequired
// ---------------------------------------------------------------------------
// Same predicate as rejection, verified independently to catch any future
// divergence in business requirements.

describe('guardSuspensionReasonRequired', () => {
  it('returns true when metadata.reason is a non-empty string', () => {
    const ctx = makeContext({ metadata: { reason: 'Fraude signalée' } });
    expect(guardSuspensionReasonRequired(ctx)).toBe(true);
  });

  it('returns false when metadata.reason is an empty string', () => {
    const ctx = makeContext({ metadata: { reason: '' } });
    expect(guardSuspensionReasonRequired(ctx)).toBe(false);
  });

  it('returns false when metadata.reason is whitespace only', () => {
    const ctx = makeContext({ metadata: { reason: '\t\n' } });
    expect(guardSuspensionReasonRequired(ctx)).toBe(false);
  });

  it('returns false when metadata.reason is absent', () => {
    const ctx = makeContext({ metadata: {} });
    expect(guardSuspensionReasonRequired(ctx)).toBe(false);
  });

  it('returns false when metadata is absent entirely', () => {
    const ctx = makeContext({ metadata: undefined });
    expect(guardSuspensionReasonRequired(ctx)).toBe(false);
  });

  it('returns false when metadata.reason is a number', () => {
    const ctx = makeContext({ metadata: { reason: 0 } });
    expect(guardSuspensionReasonRequired(ctx)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// guardBanRequired
// ---------------------------------------------------------------------------
// Ban requires BOTH a non-empty reason AND explicit confirmation=true.
// This tests the conjunction: neither condition alone is sufficient.

describe('guardBanRequired', () => {
  it('returns true when reason is non-empty AND confirmed is true', () => {
    const ctx = makeContext({
      metadata: { reason: 'Violation répétée des CGU', confirmed: true },
    });
    expect(guardBanRequired(ctx)).toBe(true);
  });

  it('returns false when reason is present but confirmed is false', () => {
    const ctx = makeContext({
      metadata: { reason: 'Violation répétée des CGU', confirmed: false },
    });
    expect(guardBanRequired(ctx)).toBe(false);
  });

  it('returns false when reason is present but confirmed is missing', () => {
    const ctx = makeContext({
      metadata: { reason: 'Fraude avérée' },
    });
    expect(guardBanRequired(ctx)).toBe(false);
  });

  it('returns false when confirmed is true but reason is empty', () => {
    const ctx = makeContext({
      metadata: { reason: '', confirmed: true },
    });
    expect(guardBanRequired(ctx)).toBe(false);
  });

  it('returns false when confirmed is true but reason is whitespace only', () => {
    const ctx = makeContext({
      metadata: { reason: '   ', confirmed: true },
    });
    expect(guardBanRequired(ctx)).toBe(false);
  });

  it('returns false when both reason and confirmed are absent', () => {
    const ctx = makeContext({ metadata: {} });
    expect(guardBanRequired(ctx)).toBe(false);
  });

  it('returns false when metadata is absent', () => {
    const ctx = makeContext({ metadata: undefined });
    expect(guardBanRequired(ctx)).toBe(false);
  });

  it('returns false when confirmed is a truthy non-boolean (e.g. string "true")', () => {
    // The guard must require confirmed === true (strict equality)
    const ctx = makeContext({
      metadata: { reason: 'Fraude avérée', confirmed: 'true' },
    });
    expect(guardBanRequired(ctx)).toBe(false);
  });

  it('returns false when confirmed is a truthy number (e.g. 1)', () => {
    const ctx = makeContext({
      metadata: { reason: 'Fraude avérée', confirmed: 1 },
    });
    expect(guardBanRequired(ctx)).toBe(false);
  });
});
