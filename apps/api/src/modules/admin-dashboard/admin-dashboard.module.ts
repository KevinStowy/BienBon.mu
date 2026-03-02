import { Module } from '@nestjs/common';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';

/**
 * AdminDashboardModule provides aggregated KPIs, revenue charts,
 * and activity feed for the admin dashboard.
 *
 * PrismaService is injected globally.
 *
 * ADR-002: Monolithe modulaire
 * ADR-004: REST API + OpenAPI
 * ADR-011: RBAC — ADMIN and SUPER_ADMIN only
 */
@Module({
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService],
})
export class AdminDashboardModule {}
