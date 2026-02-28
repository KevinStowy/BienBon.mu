import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { SupabaseModule } from './modules/supabase/supabase.module';
import { AuthModule } from './modules/auth/auth.module';
import { IdentityAccessModule } from './modules/identity-access/identity-access.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { ConsumerModule } from './modules/consumer/consumer.module';
import { FraudModule } from './modules/fraud/fraud.module';
import { SharedModule } from './shared/shared.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule,
    SharedModule,
    SupabaseModule,
    AuthModule,
    IdentityAccessModule,
    CatalogModule,
    ConsumerModule,
    FraudModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
