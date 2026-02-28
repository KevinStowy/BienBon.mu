// =============================================================================
// Store Modification Request State Machine — States and Events (ADR-018)
// =============================================================================

import { ApprovalStatus } from '@bienbon/shared-types';

export { ApprovalStatus as ApprovalState };

export enum ApprovalEvent {
  ADMIN_ASSIGN = 'ADMIN_ASSIGN',
  ADMIN_RELEASE = 'ADMIN_RELEASE',
  ADMIN_APPROVE = 'ADMIN_APPROVE',
  ADMIN_REJECT = 'ADMIN_REJECT',
  PARTNER_CANCEL = 'PARTNER_CANCEL',
  SYSTEM_SUPERSEDE = 'SYSTEM_SUPERSEDE',
}
