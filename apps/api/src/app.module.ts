import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { SupabaseModule } from './modules/supabase/supabase.module';
import { AuthModule } from './modules/auth/auth.module';
import { IdentityAccessModule } from './modules/identity-access/identity-access.module';
import { SharedModule } from './shared/shared.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [ConfigModule, SharedModule, SupabaseModule, AuthModule, IdentityAccessModule],
  controllers: [HealthController],
})
export class AppModule {}
