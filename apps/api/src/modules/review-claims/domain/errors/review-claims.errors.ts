// =============================================================================
// Review & Claims Domain Errors
// =============================================================================

import { DomainException, ErrorCode } from '@bienbon/shared-types';

export function claimNotFound(claimId: string): DomainException {
  return new DomainException(
    ErrorCode.CLAIMS_NOT_FOUND,
    `Claim "${claimId}" not found`,
    { claimId },
  );
}

export function claimWindowExpired(reservationId: string): DomainException {
  return new DomainException(
    ErrorCode.CLAIMS_WINDOW_EXPIRED,
    `The 24-hour claim window has expired for reservation "${reservationId}"`,
    { reservationId },
  );
}

export function claimAlreadyExists(reservationId: string): DomainException {
  return new DomainException(
    ErrorCode.CLAIMS_ALREADY_EXISTS,
    `An active claim already exists for reservation "${reservationId}"`,
    { reservationId },
  );
}

export function claimInvalidTransition(currentStatus: string, event: string): DomainException {
  return new DomainException(
    ErrorCode.CLAIMS_INVALID_STATUS_TRANSITION,
    `Transition "${event}" is not allowed from status "${currentStatus}"`,
    { currentStatus, event },
  );
}

export function reviewNotFound(reviewId: string): DomainException {
  return new DomainException(
    ErrorCode.REVIEW_NOT_FOUND,
    `Review "${reviewId}" not found`,
    { reviewId },
  );
}

export function reviewWindowExpired(reservationId: string): DomainException {
  return new DomainException(
    ErrorCode.REVIEW_WINDOW_EXPIRED,
    `The 24-hour review window has expired for reservation "${reservationId}"`,
    { reservationId },
  );
}

export function reviewAlreadyExists(reservationId: string): DomainException {
  return new DomainException(
    ErrorCode.REVIEW_ALREADY_EXISTS,
    `A review already exists for reservation "${reservationId}"`,
    { reservationId },
  );
}

export function reviewNotEditable(reviewId: string): DomainException {
  return new DomainException(
    ErrorCode.REVIEW_NOT_EDITABLE,
    `Review "${reviewId}" is no longer editable (24-hour window expired)`,
    { reviewId },
  );
}

export function reviewInvalidRating(rating: number): DomainException {
  return new DomainException(
    ErrorCode.REVIEW_INVALID_RATING,
    `Rating ${rating} is invalid — must be an integer between 1 and 5`,
    { rating },
  );
}

export function reservationNotPickedUp(reservationId: string): DomainException {
  return new DomainException(
    ErrorCode.ORDERING_RESERVATION_NOT_FOUND,
    `Reservation "${reservationId}" is not in PICKED_UP status`,
    { reservationId },
  );
}

export function reservationNotFound(reservationId: string): DomainException {
  return new DomainException(
    ErrorCode.ORDERING_RESERVATION_NOT_FOUND,
    `Reservation "${reservationId}" not found`,
    { reservationId },
  );
}

export function claimAccessDenied(claimId: string, consumerId: string): DomainException {
  return new DomainException(
    ErrorCode.FORBIDDEN,
    `Consumer "${consumerId}" does not own claim "${claimId}"`,
    { claimId, consumerId },
  );
}

export function reviewAccessDenied(reviewId: string, consumerId: string): DomainException {
  return new DomainException(
    ErrorCode.FORBIDDEN,
    `Consumer "${consumerId}" does not own review "${reviewId}"`,
    { reviewId, consumerId },
  );
}
