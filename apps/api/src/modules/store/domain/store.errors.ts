// =============================================================================
// Store Domain Errors
// =============================================================================

import { DomainException, ErrorCode } from '@bienbon/shared-types';

export function storeNotFound(storeId: string): DomainException {
  return new DomainException(
    ErrorCode.PARTNER_STORE_NOT_FOUND,
    `Store "${storeId}" not found`,
    { storeId },
  );
}

export function storeNotActive(storeId: string): DomainException {
  return new DomainException(
    ErrorCode.PARTNER_STORE_NOT_ACTIVE,
    `Store "${storeId}" is not active`,
    { storeId },
  );
}

export function modificationPending(storeId: string): DomainException {
  return new DomainException(
    ErrorCode.PARTNER_MODIFICATION_PENDING,
    `Store "${storeId}" already has a pending modification request`,
    { storeId },
  );
}

export function modificationInvalidTransition(
  currentStatus: string,
  event: string,
): DomainException {
  return new DomainException(
    ErrorCode.PARTNER_INVALID_STATUS_TRANSITION,
    `Cannot perform "${event}" on a modification request with status "${currentStatus}"`,
    { currentStatus, event },
  );
}
