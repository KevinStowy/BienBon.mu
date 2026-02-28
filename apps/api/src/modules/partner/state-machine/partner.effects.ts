// =============================================================================
// Partner State Machine Effects — side effects for transitions
// =============================================================================

import { Logger } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { DOMAIN_EVENTS } from '@bienbon/shared-types';
import type {
  PartnerActivatedEvent,
  PartnerSuspendedEvent,
  PartnerBannedEvent,
} from '@bienbon/shared-types';
import type { TransitionContext } from '../../../shared/state-machine';
import type { Partner } from '../domain/partner.entity';

const logger = new Logger('PartnerEffects');

/**
 * Factory functions that produce effect handlers bound to an EventEmitter2 instance.
 * This allows the effects to emit domain events without being NestJS providers.
 */

export function createActivatedEffect(emitter: EventEmitter2) {
  return async (ctx: TransitionContext<Partner>): Promise<void> => {
    const event: PartnerActivatedEvent = {
      eventId: crypto.randomUUID(),
      eventType: DOMAIN_EVENTS.PARTNER_ACTIVATED,
      occurredAt: ctx.timestamp.toISOString(),
      aggregateId: ctx.entity.id,
      aggregateType: 'Partner',
      payload: {
        partnerId: ctx.entity.id,
        userId: ctx.entity.userId,
        activatedBy: ctx.actorId,
      },
      metadata: { actorId: ctx.actorId },
    };
    emitter.emit(DOMAIN_EVENTS.PARTNER_ACTIVATED, event);
    logger.debug(`Partner ${ctx.entity.id} activated by ${ctx.actorId}`);
  };
}

export function createSuspendedEffect(emitter: EventEmitter2) {
  return async (ctx: TransitionContext<Partner>): Promise<void> => {
    const reason = String(ctx.metadata?.['reason'] ?? 'No reason provided');
    const event: PartnerSuspendedEvent = {
      eventId: crypto.randomUUID(),
      eventType: DOMAIN_EVENTS.PARTNER_SUSPENDED,
      occurredAt: ctx.timestamp.toISOString(),
      aggregateId: ctx.entity.id,
      aggregateType: 'Partner',
      payload: {
        partnerId: ctx.entity.id,
        userId: ctx.entity.userId,
        reason,
        suspendedBy: ctx.actorId,
        previousStatus: ctx.entity.status,
      },
      metadata: { actorId: ctx.actorId },
    };
    emitter.emit(DOMAIN_EVENTS.PARTNER_SUSPENDED, event);
    logger.debug(`Partner ${ctx.entity.id} suspended by ${ctx.actorId}`);
  };
}

export function createBannedEffect(emitter: EventEmitter2) {
  return async (ctx: TransitionContext<Partner>): Promise<void> => {
    const reason = String(ctx.metadata?.['reason'] ?? 'No reason provided');
    const event: PartnerBannedEvent = {
      eventId: crypto.randomUUID(),
      eventType: DOMAIN_EVENTS.PARTNER_BANNED,
      occurredAt: ctx.timestamp.toISOString(),
      aggregateId: ctx.entity.id,
      aggregateType: 'Partner',
      payload: {
        partnerId: ctx.entity.id,
        userId: ctx.entity.userId,
        reason,
        bannedBy: ctx.actorId,
      },
      metadata: { actorId: ctx.actorId },
    };
    emitter.emit(DOMAIN_EVENTS.PARTNER_BANNED, event);
    logger.debug(`Partner ${ctx.entity.id} banned by ${ctx.actorId}`);
  };
}

export function auditLogEffect(eventName: string) {
  return async (ctx: TransitionContext<Partner>): Promise<void> => {
    logger.log(
      `AUDIT: Partner ${ctx.entity.id} — event "${eventName}" by actor ${ctx.actorId} (${ctx.actorRole}) at ${ctx.timestamp.toISOString()}`,
    );
  };
}
