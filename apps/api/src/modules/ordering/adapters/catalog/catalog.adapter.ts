import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { CatalogPort, BasketInfo } from '../../ports/catalog.port';

/**
 * Catalog adapter for the Ordering BC.
 *
 * Accesses the Catalog data directly via PrismaService to avoid circular module
 * dependencies. The CatalogModule's BasketService is not imported directly —
 * this respects the bounded context isolation (ADR-024).
 *
 * Stock decrements use the same atomic raw SQL approach as the Catalog BC (ADR-008).
 */
@Injectable()
export class CatalogAdapter extends CatalogPort {
  private readonly logger = new Logger(CatalogAdapter.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getBasket(basketId: string): Promise<BasketInfo | null> {
    const basket = await this.prisma.basket.findUnique({
      where: { id: basketId },
      select: {
        id: true,
        storeId: true,
        sellingPrice: true,
        stock: true,
        pickupStart: true,
        pickupEnd: true,
        status: true,
      },
    });

    if (!basket) return null;

    return {
      id: basket.id,
      storeId: basket.storeId,
      sellingPrice: Number(basket.sellingPrice),
      stock: basket.stock,
      pickupStart: basket.pickupStart,
      pickupEnd: basket.pickupEnd,
      status: basket.status,
    };
  }

  /**
   * Atomically decrements stock using a conditional raw SQL UPDATE.
   * Returns the remaining stock, or null if insufficient stock (ADR-008).
   */
  async decrementStock(
    basketId: string,
    quantity: number,
  ): Promise<number | null> {
    type RawRow = { stock: number }[];

    const result = await this.prisma.$queryRaw<RawRow>`
      UPDATE baskets
      SET stock = stock - ${quantity}
      WHERE id = ${basketId}::uuid
        AND stock >= ${quantity}
      RETURNING stock
    `;

    if (result.length === 0) {
      this.logger.warn(
        `Insufficient stock for basket ${basketId}: requested ${quantity}`,
      );
      return null;
    }

    return Number(result[0]!.stock);
  }

  /**
   * Increments stock (e.g., on reservation cancellation or expiry).
   */
  async incrementStock(basketId: string, quantity: number): Promise<void> {
    await this.prisma.$queryRaw`
      UPDATE baskets
      SET stock = stock + ${quantity}
      WHERE id = ${basketId}::uuid
    `;

    this.logger.log(
      `Stock restored for basket ${basketId}: +${quantity}`,
    );
  }
}
