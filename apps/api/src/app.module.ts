import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { SupabaseModule } from './modules/supabase/supabase.module';
import { AuthModule } from './modules/auth/auth.module';
import { IdentityAccessModule } from './modules/identity-access/identity-access.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { ConsumerModule } from './modules/consumer/consumer.module';
import { FraudModule } from './modules/fraud/fraud.module';
import { PartnerModule } from './modules/partner/partner.module';
import { OrderingModule } from './modules/ordering/ordering.module';
import { SseModule } from './modules/sse/sse.module';
import { SharedModule } from './shared/shared.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReviewClaimsModule } from './modules/review-claims/review-claims.module';
import { AdminDashboardModule } from './modules/admin-dashboard/admin-dashboard.module';
import { AuditModule } from './modules/audit/audit.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    SharedModule,
    SupabaseModule,
    AuthModule,
    IdentityAccessModule,
    CatalogModule,
    ConsumerModule,
    FraudModule,
    PartnerModule,
    OrderingModule,
    PaymentsModule,
    ReviewClaimsModule,
    AdminDashboardModule,
    AuditModule,
    SseModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
