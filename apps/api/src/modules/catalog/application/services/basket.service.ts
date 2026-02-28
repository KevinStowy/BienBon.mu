import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BasketRepositoryPort } from '../../ports/basket.repository.port';
import type { Basket } from '../../domain/entities/basket.entity';
import type { BasketStatus } from '../../domain/enums/basket-status.enum';
import { BasketStatus as BS } from '../../domain/enums/basket-status.enum';
import { transition } from '../../domain/rules/basket-state-machine';
import { assertValidPrice } from '../../domain/rules/stock-rules';
import {
  BasketNotFoundError,
  BasketNotEditableError,
  InsufficientStockError,
} from '../../domain/errors/catalog-errors';
import {
  CATALOG_EVENTS,
  type BasketCreatedEvent,
  type BasketPublishedEvent,
  type BasketCancelledEvent,
  type BasketArchivedEvent,
  type StockDecrementedEvent,
  type BasketSoldOutEvent,
} from '../../domain/events/catalog-events';
import type { CreateBasketCommand } from '../commands/create-basket.command';
import type { UpdateBasketCommand } from '../commands/update-basket.command';
import type { PublishBasketCommand } from '../commands/publish-basket.command';
import type { CancelBasketCommand } from '../commands/cancel-basket.command';
import type { ArchiveBasketCommand } from '../commands/archive-basket.command';
import type { DecrementStockCommand } from '../commands/decrement-stock.command';
import type { GetBasketQuery } from '../queries/get-basket.query';
import type { GetAvailableBasketsQuery } from '../queries/get-available-baskets.query';
import type { GetStoreBasketsQuery } from '../queries/get-store-baskets.query';
import type { PaginatedBaskets } from '../../ports/basket.repository.port';

/**
 * Basket application service — orchestrates commands and queries.
 * Delegates domain logic to the state machine and stock rules.
 * Delegates persistence to the BasketRepositoryPort.
 * Emits domain events via EventEmitter2.
 */
@Injectable()
export class BasketService {
  private readonly logger = new Logger(BasketService.name);

  constructor(
    private readonly basketRepo: BasketRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ---------------------------------------------------------------------------
  // Commands
  // ---------------------------------------------------------------------------

  async createBasket(cmd: CreateBasketCommand): Promise<Basket> {
    // Domain rule: price must be at most 50% of original
    assertValidPrice(cmd.originalPrice, cmd.sellingPrice);

    const basket = await this.basketRepo.create({
      storeId: cmd.storeId,
      templateId: cmd.templateId,
      title: cmd.title,
      description: cmd.description,
      originalPrice: cmd.originalPrice,
      sellingPrice: cmd.sellingPrice,
      quantity: cmd.quantity,
      stock: cmd.quantity, // initial stock = quantity
      categoryId: cmd.categoryId,
      photoUrl: cmd.photoUrl,
      pickupStart: cmd.pickupStart,
      pickupEnd: cmd.pickupEnd,
      status: BS.DRAFT,
      tagIds: cmd.tagIds ?? [],
    });

    const event: BasketCreatedEvent = {
      basketId: basket.id,
      storeId: basket.storeId,
      title: basket.title,
      sellingPrice: basket.sellingPrice,
      quantity: basket.quantity,
      pickupStart: basket.pickupStart,
      pickupEnd: basket.pickupEnd,
    };
    this.eventEmitter.emit(CATALOG_EVENTS.BASKET_CREATED, event);

    this.logger.log(`Basket created: ${basket.id} for store ${basket.storeId}`);
    return basket;
  }

  async updateBasket(cmd: UpdateBasketCommand): Promise<Basket> {
    const basket = await this.requireBasket(cmd.basketId);

    if (basket.status !== BS.DRAFT) {
      throw new BasketNotEditableError(basket.status);
    }

    // Validate price if both or either price field is being updated
    const newOriginalPrice = cmd.originalPrice ?? basket.originalPrice;
    const newSellingPrice = cmd.sellingPrice ?? basket.sellingPrice;
    assertValidPrice(newOriginalPrice, newSellingPrice);

    const updated = await this.basketRepo.update(cmd.basketId, {
      title: cmd.title,
      description: cmd.description,
      originalPrice: cmd.originalPrice,
      sellingPrice: cmd.sellingPrice,
      quantity: cmd.quantity,
      // If quantity changes, reset stock accordingly (only in DRAFT)
      stock: cmd.quantity !== undefined ? cmd.quantity : undefined,
      categoryId: cmd.categoryId,
      photoUrl: cmd.photoUrl,
      pickupStart: cmd.pickupStart,
      pickupEnd: cmd.pickupEnd,
      tagIds: cmd.tagIds,
    });

    return updated;
  }

  async publishBasket(cmd: PublishBasketCommand): Promise<Basket> {
    const basket = await this.requireBasket(cmd.basketId);

    // transition() will run assertPublishable internally
    const transitioned = transition(basket, BS.PUBLISHED);
    const updated = await this.basketRepo.updateStatus(basket.id, BS.PUBLISHED);

    const event: BasketPublishedEvent = {
      basketId: updated.id,
      storeId: updated.storeId,
      title: updated.title,
      sellingPrice: updated.sellingPrice,
      stock: updated.stock,
      pickupStart: updated.pickupStart,
      pickupEnd: updated.pickupEnd,
      categoryId: updated.categoryId,
    };
    this.eventEmitter.emit(CATALOG_EVENTS.BASKET_PUBLISHED, event);

    this.logger.log(`Basket published: ${basket.id}`);
    void transitioned; // used for type-check; actual status comes from DB
    return updated;
  }

  async cancelBasket(cmd: CancelBasketCommand): Promise<Basket> {
    const basket = await this.requireBasket(cmd.basketId);

    transition(basket, BS.CANCELLED); // validates transition
    const updated = await this.basketRepo.updateStatus(basket.id, BS.CANCELLED);

    const event: BasketCancelledEvent = {
      basketId: updated.id,
      storeId: updated.storeId,
      reason: cmd.reason,
    };
    this.eventEmitter.emit(CATALOG_EVENTS.BASKET_CANCELLED, event);

    this.logger.log(`Basket cancelled: ${basket.id}`);
    return updated;
  }

  async archiveBasket(cmd: ArchiveBasketCommand): Promise<Basket> {
    const basket = await this.requireBasket(cmd.basketId);

    transition(basket, BS.ARCHIVED); // validates transition
    const updated = await this.basketRepo.updateStatus(basket.id, BS.ARCHIVED);

    const event: BasketArchivedEvent = {
      basketId: updated.id,
      storeId: updated.storeId,
    };
    this.eventEmitter.emit(CATALOG_EVENTS.BASKET_ARCHIVED, event);

    this.logger.log(`Basket archived: ${basket.id}`);
    return updated;
  }

  /**
   * Atomically decrements stock. If stock reaches 0, transitions basket to SOLD_OUT.
   * Used by the Ordering BC.
   */
  async decrementStock(cmd: DecrementStockCommand): Promise<{ remainingStock: number }> {
    const basket = await this.requireBasket(cmd.basketId);

    const remainingStock = await this.basketRepo.atomicDecrementStock(
      cmd.basketId,
      cmd.quantity,
    );

    if (remainingStock === null) {
      throw new InsufficientStockError(basket.stock, cmd.quantity);
    }

    const event: StockDecrementedEvent = {
      basketId: basket.id,
      storeId: basket.storeId,
      quantity: cmd.quantity,
      remainingStock,
    };
    this.eventEmitter.emit(CATALOG_EVENTS.STOCK_DECREMENTED, event);

    if (remainingStock === 0) {
      // Transition to SOLD_OUT if currently PUBLISHED or PICKUP_WINDOW allows it
      const currentStatus = basket.status as BasketStatus;
      if (currentStatus === BS.PUBLISHED || currentStatus === BS.PICKUP_WINDOW) {
        await this.basketRepo.updateStatus(basket.id, BS.SOLD_OUT);
        const soldOutEvent: BasketSoldOutEvent = {
          basketId: basket.id,
          storeId: basket.storeId,
        };
        this.eventEmitter.emit(CATALOG_EVENTS.BASKET_SOLD_OUT, soldOutEvent);
        this.logger.log(`Basket sold out: ${basket.id}`);
      }
    }

    return { remainingStock };
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  async getBasket(query: GetBasketQuery): Promise<Basket> {
    return this.requireBasket(query.basketId);
  }

  async getAvailableBaskets(query: GetAvailableBasketsQuery): Promise<PaginatedBaskets> {
    return this.basketRepo.findMany(
      {
        categoryId: query.categoryId,
        tagIds: query.tagIds,
        status: (query.status as BasketStatus | undefined) ?? BS.PUBLISHED,
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
        pickupAfter: query.pickupAfter,
        pickupBefore: query.pickupBefore,
        latitude: query.latitude,
        longitude: query.longitude,
        radiusKm: query.radiusKm,
      },
      {
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      },
    );
  }

  async getStoreBaskets(query: GetStoreBasketsQuery): Promise<PaginatedBaskets> {
    return this.basketRepo.findByStore(query.storeId, {
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async requireBasket(id: string): Promise<Basket> {
    const basket = await this.basketRepo.findById(id);
    if (!basket) {
      throw new BasketNotFoundError(id);
    }
    return basket;
  }
}
