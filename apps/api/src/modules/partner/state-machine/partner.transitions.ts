// =============================================================================
// Partner State Machine Transition Table (ADR-017)
// =============================================================================
// P1: PENDING  -> ADMIN_VALIDATE -> ACTIVE
// P2: PENDING  -> ADMIN_REJECT   -> REJECTED
// P3: ACTIVE   -> ADMIN_SUSPEND  -> SUSPENDED
// P4: SUSPENDED-> ADMIN_REACTIVATE -> ACTIVE
// P5: ACTIVE   -> ADMIN_BAN     -> BANNED
// P6: SUSPENDED-> ADMIN_BAN     -> BANNED
// P7: REJECTED -> ADMIN_VALIDATE-> ACTIVE
// P8: PENDING  -> PARTNER_CANCEL-> CANCELLED (using REJECTED as terminal state placeholder)
// =============================================================================

import { PartnerStatus } from '@bienbon/shared-types';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { TransitionTable } from '../../../shared/state-machine';
import type { Partner } from '../domain/partner.entity';
import { PartnerEvent } from './partner.states';
import {
  guardAdminOnly,
  guardBanRequired,
  guardRejectionReasonRequired,
  guardSuspensionReasonRequired,
} from './partner.guards';
import {
  auditLogEffect,
  createActivatedEffect,
  createBannedEffect,
  createSuspendedEffect,
} from './partner.effects';

export function buildPartnerTransitionTable(
  emitter: EventEmitter2,
): TransitionTable<PartnerStatus, PartnerEvent, Partner> {
  const activatedEffect = createActivatedEffect(emitter);
  const suspendedEffect = createSuspendedEffect(emitter);
  const bannedEffect = createBannedEffect(emitter);

  return {
    [PartnerStatus.PENDING]: {
      [PartnerEvent.ADMIN_VALIDATE]: {
        target: PartnerStatus.ACTIVE,
        guards: [guardAdminOnly],
        effects: [activatedEffect, auditLogEffect(PartnerEvent.ADMIN_VALIDATE)],
        description: 'P1: Admin validates pending partner registration',
      },
      [PartnerEvent.ADMIN_REJECT]: {
        target: PartnerStatus.REJECTED,
        guards: [guardAdminOnly, guardRejectionReasonRequired],
        effects: [auditLogEffect(PartnerEvent.ADMIN_REJECT)],
        description: 'P2: Admin rejects pending partner registration',
      },
      [PartnerEvent.PARTNER_CANCEL]: {
        target: PartnerStatus.REJECTED,
        guards: [],
        effects: [auditLogEffect(PartnerEvent.PARTNER_CANCEL)],
        description: 'P8: Partner cancels their own pending registration',
      },
    },
    [PartnerStatus.ACTIVE]: {
      [PartnerEvent.ADMIN_SUSPEND]: {
        target: PartnerStatus.SUSPENDED,
        guards: [guardAdminOnly, guardSuspensionReasonRequired],
        effects: [suspendedEffect, auditLogEffect(PartnerEvent.ADMIN_SUSPEND)],
        description: 'P3: Admin suspends active partner',
      },
      [PartnerEvent.ADMIN_BAN]: {
        target: PartnerStatus.BANNED,
        guards: [guardAdminOnly, guardBanRequired],
        effects: [bannedEffect, auditLogEffect(PartnerEvent.ADMIN_BAN)],
        description: 'P5: Admin bans active partner',
      },
    },
    [PartnerStatus.SUSPENDED]: {
      [PartnerEvent.ADMIN_REACTIVATE]: {
        target: PartnerStatus.ACTIVE,
        guards: [guardAdminOnly],
        effects: [activatedEffect, auditLogEffect(PartnerEvent.ADMIN_REACTIVATE)],
        description: 'P4: Admin reactivates suspended partner',
      },
      [PartnerEvent.ADMIN_BAN]: {
        target: PartnerStatus.BANNED,
        guards: [guardAdminOnly, guardBanRequired],
        effects: [bannedEffect, auditLogEffect(PartnerEvent.ADMIN_BAN)],
        description: 'P6: Admin bans suspended partner',
      },
    },
    [PartnerStatus.REJECTED]: {
      [PartnerEvent.ADMIN_VALIDATE]: {
        target: PartnerStatus.ACTIVE,
        guards: [guardAdminOnly],
        effects: [activatedEffect, auditLogEffect(PartnerEvent.ADMIN_VALIDATE)],
        description: 'P7: Admin validates previously rejected partner',
      },
    },
    [PartnerStatus.BANNED]: {},
  };
}
