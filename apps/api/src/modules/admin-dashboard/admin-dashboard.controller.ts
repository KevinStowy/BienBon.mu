// =============================================================================
// AdminDashboardController — admin dashboard endpoints
// =============================================================================

import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@bienbon/shared-types';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminDashboardService } from './admin-dashboard.service';
import type { DashboardKpis, RevenueDataPoint, ActivityEvent, DailyFocus } from './admin-dashboard.service';

@ApiTags('Admin - Dashboard')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('api/v1/admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  // ---------------------------------------------------------------------------
  // GET /api/v1/admin/dashboard/kpis
  // ---------------------------------------------------------------------------

  @Get('kpis')
  @ApiOperation({
    summary: 'Get dashboard KPIs',
    description: 'Returns aggregated key performance indicators for the admin dashboard.',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['today', 'this_week', 'this_month'],
    description: 'Period for growth comparison',
  })
  @ApiResponse({ status: 200, description: 'KPIs returned' })
  async getKpis(
    @Query('period') period?: string,
  ): Promise<DashboardKpis> {
    return this.dashboardService.getKpis(period ?? 'this_month');
  }

  // ---------------------------------------------------------------------------
  // GET /api/v1/admin/dashboard/daily-focus
  // ---------------------------------------------------------------------------

  @Get('daily-focus')
  @ApiOperation({
    summary: 'Get daily focus metrics',
    description: 'Returns today\'s key operational metrics (pickups, pending claims, pending partners, expiring baskets).',
  })
  @ApiResponse({ status: 200, description: 'Daily focus returned' })
  async getDailyFocus(): Promise<DailyFocus> {
    return this.dashboardService.getDailyFocus();
  }

  // ---------------------------------------------------------------------------
  // GET /api/v1/admin/dashboard/revenue
  // ---------------------------------------------------------------------------

  @Get('revenue')
  @ApiOperation({
    summary: 'Get revenue chart data',
    description: 'Returns daily revenue, basket count, and commission for chart display.',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['today', 'this_week', 'this_month'],
    description: 'Period for the chart data',
  })
  @ApiResponse({ status: 200, description: 'Revenue data returned' })
  async getRevenueChart(
    @Query('period') period?: string,
  ): Promise<RevenueDataPoint[]> {
    return this.dashboardService.getRevenueChart(period ?? 'this_month');
  }

  // ---------------------------------------------------------------------------
  // GET /api/v1/admin/dashboard/activity
  // ---------------------------------------------------------------------------

  @Get('activity')
  @ApiOperation({
    summary: 'Get recent activity feed',
    description: 'Returns the most recent audit log entries formatted as an activity feed.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of activity items to return (max 100)',
  })
  @ApiResponse({ status: 200, description: 'Activity events returned' })
  async getRecentActivity(
    @Query('limit') limit?: string,
  ): Promise<ActivityEvent[]> {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.dashboardService.getRecentActivity(parsedLimit);
  }
}
