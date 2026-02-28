import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SseService } from '../sse.service';
import { SSE_EVENT_TYPES } from '../types/sse-event.types';
import type {
  StockUpdatedDomainEvent,
  BasketPublishedDomainEvent,
} from '../types/sse-event.types';

/**
 * Listens to catalog domain events and forwards them as SSE events.
 *
 * Event sources:
 * - `catalog.basket.stock_updated` → dispatched to:
 *     - consumers who subscribed to this basket
 *     - the partner who owns the store
 * - `catalog.basket.published` → dispatched to:
 *     - the partner who owns the store (confirmation)
 *
 * ADR-009: In-process EventEmitter2 for Phase 1 (no Redis Pub/Sub yet)
 */
@Injectable()
export class StockListener {
  private readonly logger = new Logger(StockListener.name);

  constructor(private readonly sseService: SseService) {}

  // ---------------------------------------------------------------------------
  // catalog.basket.stock_updated
  // ---------------------------------------------------------------------------

  @OnEvent('catalog.basket.stock_updated')
  handleStockUpdated(event: StockUpdatedDomainEvent): void {
    this.logger.debug(
      `Handling catalog.basket.stock_updated: basketId=${event.basketId} stock=${event.stock}`,
    );

    const payload = {
      basketId: event.basketId,
      stock: event.stock,
    };

    // Dispatch to consumers who are subscribed to this basket
    this.sseService.emitToChannel(
      event.basketId,
      SSE_EVENT_TYPES.STOCK_UPDATE,
      payload,
    );

    // Dispatch to the partner who owns the store (identified by storeId as userId)
    // Note: storeId maps to a partner's userId in the partner BC
    this.sseService.emitToUser(
      event.storeId,
      SSE_EVENT_TYPES.STOCK_UPDATE,
      payload,
    );
  }

  // ---------------------------------------------------------------------------
  // catalog.basket.published
  // ---------------------------------------------------------------------------

  @OnEvent('catalog.basket.published')
  handleBasketPublished(event: BasketPublishedDomainEvent): void {
    this.logger.debug(
      `Handling catalog.basket.published: basketId=${event.basketId} storeId=${event.storeId}`,
    );

    // Notify the partner that their basket is now live
    this.sseService.emitToUser(event.storeId, SSE_EVENT_TYPES.STOCK_UPDATE, {
      basketId: event.basketId,
      status: 'published',
    });
  }
}
