import { Module } from '@nestjs/common';
import { ConsumerProfileController } from './consumer-profile.controller';
import { ConsumerProfileService } from './consumer-profile.service';
import { FavoriteController } from './favorite.controller';
import { FavoriteService } from './favorite.service';
import { BadgeController } from './badge.controller';
import { BadgeService } from './badge.service';
import { ReferralController } from './referral.controller';
import { ReferralService } from './referral.service';
import { AdminConsumerController } from './admin-consumer.controller';
import { AdminConsumerService } from './admin-consumer.service';

/**
 * ConsumerModule — bounded context for consumer-facing profile, favorites,
 * badges, and referral features.
 * Also includes admin endpoints for consumer management.
 *
 * Classification: CRUD simple (no hexagonal architecture).
 * PrismaService is provided globally by SharedModule (@Global).
 *
 * ADR-002: Monolithe modulaire
 * ADR-004: REST API + OpenAPI
 * ADR-010: Auth Supabase (JWT)
 * ADR-011: RBAC
 */
@Module({
  controllers: [
    ConsumerProfileController,
    FavoriteController,
    BadgeController,
    ReferralController,
    AdminConsumerController,
  ],
  providers: [
    ConsumerProfileService,
    FavoriteService,
    BadgeService,
    ReferralService,
    AdminConsumerService,
  ],
  exports: [
    ConsumerProfileService,
    FavoriteService,
    BadgeService,
    ReferralService,
    AdminConsumerService,
  ],
})
export class ConsumerModule {}
