/**
 * Base class for all domain-level errors in BienBon.
 *
 * Domain errors represent expected business failures (e.g., "stock insufficient",
 * "reservation already cancelled") and are caught by the DomainErrorFilter to
 * produce structured JSON responses.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    // Restore prototype chain broken by extending built-in Error
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Resource not found (HTTP 404).
 *
 * @example
 * throw new NotFoundError('BASKET_NOT_FOUND', 'Basket with ID xyz not found');
 */
export class NotFoundError extends DomainError {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message, 404);
    this.code = code;
  }
}

/**
 * Conflict with current state (HTTP 409).
 *
 * @example
 * throw new ConflictError('RESERVATION_ALREADY_EXISTS', 'User already has an active reservation');
 */
export class ConflictError extends DomainError {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message, 409);
    this.code = code;
  }
}

/**
 * Forbidden action for the current user (HTTP 403).
 *
 * @example
 * throw new ForbiddenError('STORE_NOT_OWNED', 'You do not own this store');
 */
export class ForbiddenError extends DomainError {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message, 403);
    this.code = code;
  }
}

/**
 * Input validation error from the domain layer (HTTP 422).
 *
 * Use this for domain-level validation that goes beyond DTO validation.
 *
 * @example
 * throw new ValidationError('INVALID_PICKUP_WINDOW', 'Pickup end must be after pickup start');
 */
export class ValidationError extends DomainError {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message, 422);
    this.code = code;
  }
}

/**
 * Business rule violation (HTTP 400).
 *
 * Use for domain invariant violations such as "stock insufficient",
 * "store is closed", "basket already sold out".
 *
 * @example
 * throw new BusinessRuleError('INSUFFICIENT_STOCK', 'Not enough stock available');
 */
export class BusinessRuleError extends DomainError {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message, 400);
    this.code = code;
  }
}
