// =============================================================================
// Partner Domain Errors
// =============================================================================

import { DomainException, ErrorCode } from '@bienbon/shared-types';

export function partnerNotFound(partnerId: string): DomainException {
  return new DomainException(
    ErrorCode.PARTNER_NOT_FOUND,
    `Partner "${partnerId}" not found`,
    { partnerId },
  );
}

export function partnerNotActive(partnerId: string): DomainException {
  return new DomainException(
    ErrorCode.PARTNER_NOT_ACTIVE,
    `Partner "${partnerId}" is not active`,
    { partnerId },
  );
}

export function partnerInvalidTransition(
  currentStatus: string,
  event: string,
): DomainException {
  return new DomainException(
    ErrorCode.PARTNER_INVALID_STATUS_TRANSITION,
    `Cannot perform "${event}" on a partner with status "${currentStatus}"`,
    { currentStatus, event },
  );
}
