// =============================================================================
// Store Approval State Machine Effects
// =============================================================================

import { Logger } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { DOMAIN_EVENTS } from '@bienbon/shared-types';
import type {
  StoreModificationApprovedEvent,
  StoreModificationRejectedEvent,
} from '@bienbon/shared-types';
import type { TransitionContext } from '../../../shared/state-machine';

type ApprovalRequestEntity = {
  id: string;
  storeId: string;
  submittedBy: string;
  status: string;
  fieldChanges: unknown;
};

const logger = new Logger('ApprovalEffects');

export function createApprovedEffect(emitter: EventEmitter2) {
  return async (ctx: TransitionContext<ApprovalRequestEntity>): Promise<void> => {
    const fieldChanges = ctx.entity.fieldChanges as Record<string, unknown>;
    const changedFields = Object.keys(fieldChanges);

    const event: StoreModificationApprovedEvent = {
      eventId: crypto.randomUUID(),
      eventType: DOMAIN_EVENTS.STORE_MODIFICATION_APPROVED,
      occurredAt: ctx.timestamp.toISOString(),
      aggregateId: ctx.entity.id,
      aggregateType: 'StoreModificationRequest',
      payload: {
        requestId: ctx.entity.id,
        storeId: ctx.entity.storeId,
        approvedBy: ctx.actorId,
        changedFields,
      },
      metadata: { actorId: ctx.actorId },
    };
    emitter.emit(DOMAIN_EVENTS.STORE_MODIFICATION_APPROVED, event);
    logger.debug(`Modification request ${ctx.entity.id} approved for store ${ctx.entity.storeId}`);
  };
}

export function createRejectedEffect(emitter: EventEmitter2) {
  return async (ctx: TransitionContext<ApprovalRequestEntity>): Promise<void> => {
    const reason = String(ctx.metadata?.['reason'] ?? 'No reason provided');

    const event: StoreModificationRejectedEvent = {
      eventId: crypto.randomUUID(),
      eventType: DOMAIN_EVENTS.STORE_MODIFICATION_REJECTED,
      occurredAt: ctx.timestamp.toISOString(),
      aggregateId: ctx.entity.id,
      aggregateType: 'StoreModificationRequest',
      payload: {
        requestId: ctx.entity.id,
        storeId: ctx.entity.storeId,
        rejectedBy: ctx.actorId,
        rejectionReason: reason,
      },
      metadata: { actorId: ctx.actorId },
    };
    emitter.emit(DOMAIN_EVENTS.STORE_MODIFICATION_REJECTED, event);
    logger.debug(`Modification request ${ctx.entity.id} rejected for store ${ctx.entity.storeId}`);
  };
}

export function auditLogEffect(eventName: string) {
  return async (ctx: TransitionContext<ApprovalRequestEntity>): Promise<void> => {
    logger.log(
      `AUDIT: ModificationRequest ${ctx.entity.id} — event "${eventName}" by actor ${ctx.actorId} (${ctx.actorRole}) at ${ctx.timestamp.toISOString()}`,
    );
  };
}
