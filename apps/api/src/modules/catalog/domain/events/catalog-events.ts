/**
 * Domain events for the Catalog bounded context.
 *
 * These events are emitted via EventEmitter2 to allow other
 * bounded contexts to react without direct imports (ADR-024).
 */

export const CATALOG_EVENTS = {
  BASKET_CREATED: 'catalog.basket.created',
  BASKET_PUBLISHED: 'catalog.basket.published',
  BASKET_CANCELLED: 'catalog.basket.cancelled',
  BASKET_ARCHIVED: 'catalog.basket.archived',
  STOCK_DECREMENTED: 'catalog.stock.decremented',
  STOCK_INCREMENTED: 'catalog.stock.incremented',
  BASKET_SOLD_OUT: 'catalog.basket.sold_out',
  BASKET_STOCK_RESTORED: 'catalog.basket.stock_restored',
} as const;

export type CatalogEventKey = (typeof CATALOG_EVENTS)[keyof typeof CATALOG_EVENTS];

export interface BasketCreatedEvent {
  basketId: string;
  storeId: string;
  title: string;
  sellingPrice: number;
  quantity: number;
  pickupStart: Date;
  pickupEnd: Date;
}

export interface BasketPublishedEvent {
  basketId: string;
  storeId: string;
  title: string;
  sellingPrice: number;
  stock: number;
  pickupStart: Date;
  pickupEnd: Date;
  categoryId: string;
}

export interface BasketCancelledEvent {
  basketId: string;
  storeId: string;
  reason?: string;
}

export interface BasketArchivedEvent {
  basketId: string;
  storeId: string;
}

export interface StockDecrementedEvent {
  basketId: string;
  storeId: string;
  quantity: number;
  remainingStock: number;
}

export interface StockIncrementedEvent {
  basketId: string;
  storeId: string;
  quantity: number;
  newStock: number;
}

export interface BasketSoldOutEvent {
  basketId: string;
  storeId: string;
}

export interface BasketStockRestoredEvent {
  basketId: string;
  storeId: string;
  newStock: number;
}
