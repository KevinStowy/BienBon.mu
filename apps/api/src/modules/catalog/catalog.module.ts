import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BasketController } from './api/basket.controller';
import { BasketService } from './application/services/basket.service';
import { CategoryService } from './application/services/category.service';
import { BasketRepositoryPort } from './ports/basket.repository.port';
import { CategoryRepositoryPort } from './ports/category.repository.port';
import { TagRepositoryPort } from './ports/tag.repository.port';
import { PrismaBasketRepository } from './adapters/prisma/prisma-basket.repository';
import { PrismaCategoryRepository } from './adapters/prisma/prisma-category.repository';
import { PrismaTagRepository } from './adapters/prisma/prisma-tag.repository';

/**
 * CatalogModule — bounded context for baskets, categories, tags, stock.
 *
 * Hexagonal architecture: controllers → services → ports ← adapters (Prisma).
 *
 * ADR-002: Monolithe modulaire
 * ADR-008: Stock atomique
 * ADR-017: State machine panier
 * ADR-024: DDD / hexagonal pour BC complexe
 */
@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [BasketController],
  providers: [
    BasketService,
    CategoryService,
    { provide: BasketRepositoryPort, useClass: PrismaBasketRepository },
    { provide: CategoryRepositoryPort, useClass: PrismaCategoryRepository },
    { provide: TagRepositoryPort, useClass: PrismaTagRepository },
  ],
  exports: [BasketService, CategoryService],
})
export class CatalogModule {}
