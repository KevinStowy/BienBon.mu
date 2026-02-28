import { BusinessRuleError, NotFoundError, ValidationError } from '../../../../shared/errors/domain-error';

/**
 * Thrown when a basket state transition is not allowed by the state machine.
 *
 * @example
 * throw new InvalidBasketTransitionError('SOLD_OUT', 'DRAFT');
 */
export class InvalidBasketTransitionError extends BusinessRuleError {
  constructor(from: string, to: string) {
    super(
      'INVALID_BASKET_TRANSITION',
      `Cannot transition basket from '${from}' to '${to}'`,
    );
  }
}

/**
 * Thrown when there is not enough stock to fulfill a reservation.
 */
export class InsufficientStockError extends BusinessRuleError {
  constructor(available: number, requested: number) {
    super(
      'INSUFFICIENT_STOCK',
      `Not enough stock: requested ${requested}, available ${available}`,
    );
  }
}

/**
 * Thrown when a basket is not found.
 */
export class BasketNotFoundError extends NotFoundError {
  constructor(basketId: string) {
    super('BASKET_NOT_FOUND', `Basket '${basketId}' not found`);
  }
}

/**
 * Thrown when a category is not found.
 */
export class CategoryNotFoundError extends NotFoundError {
  constructor(categoryId: string) {
    super('CATEGORY_NOT_FOUND', `Category '${categoryId}' not found`);
  }
}

/**
 * Thrown when a tag is not found.
 */
export class TagNotFoundError extends NotFoundError {
  constructor(tagId: string) {
    super('TAG_NOT_FOUND', `Tag '${tagId}' not found`);
  }
}

/**
 * Thrown when a basket cannot be published because it fails publish guards.
 */
export class BasketPublishGuardError extends ValidationError {
  constructor(reason: string) {
    super('BASKET_PUBLISH_GUARD', reason);
  }
}

/**
 * Thrown when a basket price violates the 50% discount rule.
 */
export class InvalidBasketPriceError extends ValidationError {
  constructor(sellingPrice: number, originalPrice: number) {
    super(
      'INVALID_BASKET_PRICE',
      `Selling price (${sellingPrice}) must be at most 50% of original price (${originalPrice}). Max allowed: ${originalPrice * 0.5}`,
    );
  }
}

/**
 * Thrown when trying to update a basket that is not in DRAFT status.
 */
export class BasketNotEditableError extends BusinessRuleError {
  constructor(status: string) {
    super(
      'BASKET_NOT_EDITABLE',
      `Basket in status '${status}' cannot be edited. Only DRAFT baskets are editable.`,
    );
  }
}

/**
 * Thrown when a partner tries to access a basket they don't own.
 */
export class BasketStoreAccessDeniedError extends BusinessRuleError {
  constructor() {
    super('BASKET_STORE_ACCESS_DENIED', 'You do not have access to this basket store');
  }
}
