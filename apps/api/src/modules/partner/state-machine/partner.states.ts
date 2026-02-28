// =============================================================================
// Partner State Machine — States and Events (ADR-017)
// =============================================================================

import { PartnerStatus } from '@bienbon/shared-types';

export { PartnerStatus as PartnerState };

export enum PartnerEvent {
  ADMIN_VALIDATE = 'ADMIN_VALIDATE',
  ADMIN_REJECT = 'ADMIN_REJECT',
  ADMIN_SUSPEND = 'ADMIN_SUSPEND',
  ADMIN_REACTIVATE = 'ADMIN_REACTIVATE',
  ADMIN_BAN = 'ADMIN_BAN',
  PARTNER_CANCEL = 'PARTNER_CANCEL',
}
