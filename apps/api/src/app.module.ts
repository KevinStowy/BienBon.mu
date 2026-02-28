import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { SupabaseModule } from './modules/supabase/supabase.module';
import { AuthModule } from './modules/auth/auth.module';
import { IdentityAccessModule } from './modules/identity-access/identity-access.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { ConsumerModule } from './modules/consumer/consumer.module';
import { FraudModule } from './modules/fraud/fraud.module';
import { PartnerModule } from './modules/partner/partner.module';
import { SharedModule } from './shared/shared.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot(),
    PrismaModule,
    SharedModule,
    SupabaseModule,
    AuthModule,
    IdentityAccessModule,
    CatalogModule,
    ConsumerModule,
    FraudModule,
    PartnerModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
