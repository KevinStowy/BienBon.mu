// =============================================================================
// Store Modification Request Transition Table (ADR-018)
// =============================================================================
// PENDING    -> ADMIN_ASSIGN    -> IN_REVIEW
// IN_REVIEW  -> ADMIN_RELEASE   -> PENDING
// IN_REVIEW  -> ADMIN_APPROVE   -> APPROVED  (applies field_changes to store)
// IN_REVIEW  -> ADMIN_REJECT    -> REJECTED  (reason required)
// PENDING    -> PARTNER_CANCEL  -> CANCELLED
// PENDING    -> SYSTEM_SUPERSEDE-> SUPERSEDED
// =============================================================================

import { ApprovalStatus } from '@bienbon/shared-types';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { TransitionTable } from '../../../shared/state-machine';
import { ApprovalEvent } from './approval.states';
import {
  guardAdminOnly,
  guardPartnerOrAdmin,
  guardRejectionReasonRequired,
} from './approval.guards';
import {
  auditLogEffect,
  createApprovedEffect,
  createRejectedEffect,
} from './approval.effects';

type ApprovalRequestEntity = {
  id: string;
  storeId: string;
  submittedBy: string;
  status: string;
  fieldChanges: unknown;
};

export function buildApprovalTransitionTable(
  emitter: EventEmitter2,
): TransitionTable<ApprovalStatus, ApprovalEvent, ApprovalRequestEntity> {
  const approvedEffect = createApprovedEffect(emitter);
  const rejectedEffect = createRejectedEffect(emitter);

  return {
    [ApprovalStatus.PENDING]: {
      [ApprovalEvent.ADMIN_ASSIGN]: {
        target: ApprovalStatus.IN_REVIEW,
        guards: [guardAdminOnly],
        effects: [auditLogEffect(ApprovalEvent.ADMIN_ASSIGN)],
        description: 'Admin assigns a pending request for review',
      },
      [ApprovalEvent.PARTNER_CANCEL]: {
        target: ApprovalStatus.CANCELLED,
        guards: [guardPartnerOrAdmin],
        effects: [auditLogEffect(ApprovalEvent.PARTNER_CANCEL)],
        description: 'Partner cancels their pending modification request',
      },
      [ApprovalEvent.SYSTEM_SUPERSEDE]: {
        target: ApprovalStatus.SUPERSEDED,
        guards: [],
        effects: [auditLogEffect(ApprovalEvent.SYSTEM_SUPERSEDE)],
        description: 'System supersedes a request when a newer one is submitted for the same fields',
      },
    },
    [ApprovalStatus.IN_REVIEW]: {
      [ApprovalEvent.ADMIN_RELEASE]: {
        target: ApprovalStatus.PENDING,
        guards: [guardAdminOnly],
        effects: [auditLogEffect(ApprovalEvent.ADMIN_RELEASE)],
        description: 'Admin releases a request back to pending',
      },
      [ApprovalEvent.ADMIN_APPROVE]: {
        target: ApprovalStatus.APPROVED,
        guards: [guardAdminOnly],
        effects: [approvedEffect, auditLogEffect(ApprovalEvent.ADMIN_APPROVE)],
        description: 'Admin approves the modification request and applies changes',
      },
      [ApprovalEvent.ADMIN_REJECT]: {
        target: ApprovalStatus.REJECTED,
        guards: [guardAdminOnly, guardRejectionReasonRequired],
        effects: [rejectedEffect, auditLogEffect(ApprovalEvent.ADMIN_REJECT)],
        description: 'Admin rejects the modification request with a reason',
      },
    },
    [ApprovalStatus.APPROVED]: {},
    [ApprovalStatus.REJECTED]: {},
    [ApprovalStatus.CANCELLED]: {},
    [ApprovalStatus.SUPERSEDED]: {},
  };
}
