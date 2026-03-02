// =============================================================================
// AdminDashboardService — aggregated KPIs, revenue charts, recent activity
// =============================================================================
// Response shapes MUST match apps/admin/src/api/types.ts exactly.

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// --- Interfaces matching frontend types.ts ---

export interface DashboardKpis {
  totalConsumers: number;
  consumersGrowth: number;
  activePartners: number;
  partnersGrowth: number;
  basketsSaved: number;
  basketsGrowth: number;
  totalRevenue: number;
  revenueGrowth: number;
  commissionEarned: number;
  commissionGrowth: number;
  reservationsToday: number;
  reservationsTodayCompleted: number;
  reservationsTodayInProgress: number;
  reservationsGrowth: number;
  openClaims: number;
  claimsGrowth: number;
  claimsOver24h: number;
  claimsOver48h: number;
}

export interface DailyFocus {
  basketsPublished: number;
  basketsPublishedYesterday: number;
  basketsPublishedLastWeek: number;
  reservations: number;
  reservationsYesterday: number;
  reservationsLastWeek: number;
  pickupsCompleted: number;
  pickupsYesterday: number;
  pickupsLastWeek: number;
  dailyRevenue: number;
  dailyRevenueYesterday: number;
  dailyRevenueLastWeek: number;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  baskets: number;
  commission: number;
}

export interface ActivityEvent {
  id: string;
  type: string;
  actor: string;
  description: string;
  timestamp: string;
  category: 'PARTNER' | 'CONSUMER' | 'CLAIM' | 'FINANCE' | 'FRAUD';
}

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // KPIs
  // ---------------------------------------------------------------------------

  async getKpis(period: string): Promise<DashboardKpis> {
    const { currentStart, previousStart, currentEnd } = this.getPeriodBounds(period);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const h24ago = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const h48ago = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const [
      currentRevenue,
      previousRevenue,
      currentBaskets,
      previousBaskets,
      activePartners,
      previousActivePartners,
      totalConsumers,
      previousTotalConsumers,
      openClaims,
      previousOpenClaims,
      currentCommission,
      previousCommission,
      reservationsToday,
      reservationsTodayCompleted,
      reservationsTodayInProgress,
      previousTodayReservations,
      claimsOver24h,
      claimsOver48h,
    ] = await Promise.all([
      this.sumPayments(currentStart, currentEnd),
      this.sumPayments(previousStart, currentStart),
      this.countBasketsSaved(currentStart, currentEnd),
      this.countBasketsSaved(previousStart, currentStart),
      this.prisma.partnerProfile.count({ where: { status: 'ACTIVE' } }),
      this.prisma.partnerProfile.count({
        where: { status: 'ACTIVE', createdAt: { lt: currentStart } },
      }),
      this.prisma.user.count({
        where: { roles: { some: { role: 'CONSUMER' } } },
      }),
      this.prisma.user.count({
        where: {
          roles: { some: { role: 'CONSUMER' } },
          createdAt: { lt: currentStart },
        },
      }),
      this.prisma.claim.count({
        where: { status: { in: ['OPEN', 'IN_REVIEW'] } },
      }),
      this.prisma.claim.count({
        where: {
          status: { in: ['OPEN', 'IN_REVIEW'] },
          createdAt: { lt: currentStart },
        },
      }),
      this.sumCommissions(currentStart, currentEnd),
      this.sumCommissions(previousStart, currentStart),
      // Today's reservations (all)
      this.prisma.reservation.count({
        where: { createdAt: { gte: todayStart } },
      }),
      // Today completed (PICKED_UP)
      this.prisma.reservation.count({
        where: { status: 'PICKED_UP', pickedUpAt: { gte: todayStart } },
      }),
      // Today in progress (CONFIRMED, READY)
      this.prisma.reservation.count({
        where: {
          status: { in: ['CONFIRMED', 'READY'] },
          createdAt: { gte: todayStart },
        },
      }),
      // Yesterday's reservations for growth calc
      this.prisma.reservation.count({
        where: {
          createdAt: {
            gte: new Date(todayStart.getTime() - 24 * 60 * 60 * 1000),
            lt: todayStart,
          },
        },
      }),
      // Claims > 24h
      this.prisma.claim.count({
        where: {
          status: { in: ['OPEN', 'IN_REVIEW'] },
          createdAt: { lt: h24ago, gte: h48ago },
        },
      }),
      // Claims > 48h
      this.prisma.claim.count({
        where: {
          status: { in: ['OPEN', 'IN_REVIEW'] },
          createdAt: { lt: h48ago },
        },
      }),
    ]);

    return {
      totalConsumers,
      consumersGrowth: this.calcGrowth(previousTotalConsumers, totalConsumers),
      activePartners,
      partnersGrowth: this.calcGrowth(previousActivePartners, activePartners),
      basketsSaved: currentBaskets,
      basketsGrowth: this.calcGrowth(previousBaskets, currentBaskets),
      totalRevenue: currentRevenue,
      revenueGrowth: this.calcGrowth(previousRevenue, currentRevenue),
      commissionEarned: currentCommission,
      commissionGrowth: this.calcGrowth(previousCommission, currentCommission),
      reservationsToday,
      reservationsTodayCompleted,
      reservationsTodayInProgress,
      reservationsGrowth: this.calcGrowth(previousTodayReservations, reservationsToday),
      openClaims,
      claimsGrowth: this.calcGrowth(previousOpenClaims, openClaims),
      claimsOver24h,
      claimsOver48h,
    };
  }

  // ---------------------------------------------------------------------------
  // Daily Focus
  // ---------------------------------------------------------------------------

  async getDailyFocus(): Promise<DailyFocus> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const lastWeekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      basketsPublished,
      basketsPublishedYesterday,
      basketsPublishedLastWeek,
      reservations,
      reservationsYesterday,
      reservationsLastWeek,
      pickupsCompleted,
      pickupsYesterday,
      pickupsLastWeek,
      dailyRevenue,
      dailyRevenueYesterday,
      dailyRevenueLastWeek,
    ] = await Promise.all([
      this.prisma.basket.count({
        where: { status: 'PUBLISHED', createdAt: { gte: todayStart } },
      }),
      this.prisma.basket.count({
        where: { status: 'PUBLISHED', createdAt: { gte: yesterdayStart, lt: todayStart } },
      }),
      this.prisma.basket.count({
        where: { status: 'PUBLISHED', createdAt: { gte: lastWeekStart, lt: yesterdayStart } },
      }),
      this.prisma.reservation.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.reservation.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }),
      this.prisma.reservation.count({ where: { createdAt: { gte: lastWeekStart, lt: yesterdayStart } } }),
      this.prisma.reservation.count({
        where: { status: 'PICKED_UP', pickedUpAt: { gte: todayStart } },
      }),
      this.prisma.reservation.count({
        where: { status: 'PICKED_UP', pickedUpAt: { gte: yesterdayStart, lt: todayStart } },
      }),
      this.prisma.reservation.count({
        where: { status: 'PICKED_UP', pickedUpAt: { gte: lastWeekStart, lt: yesterdayStart } },
      }),
      this.sumPayments(todayStart, new Date()),
      this.sumPayments(yesterdayStart, todayStart),
      this.sumPayments(lastWeekStart, yesterdayStart),
    ]);

    return {
      basketsPublished,
      basketsPublishedYesterday,
      basketsPublishedLastWeek,
      reservations,
      reservationsYesterday,
      reservationsLastWeek,
      pickupsCompleted,
      pickupsYesterday,
      pickupsLastWeek,
      dailyRevenue,
      dailyRevenueYesterday,
      dailyRevenueLastWeek,
    };
  }

  // ---------------------------------------------------------------------------
  // Revenue chart
  // ---------------------------------------------------------------------------

  async getRevenueChart(period: string): Promise<RevenueDataPoint[]> {
    const { currentStart, currentEnd } = this.getPeriodBounds(period);
    const days = Math.ceil((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24));

    const result: RevenueDataPoint[] = [];

    for (let i = 0; i < days; i++) {
      const dayStart = new Date(currentStart);
      dayStart.setDate(dayStart.getDate() + i);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const [revenue, commission, basketCount] = await Promise.all([
        this.sumPayments(dayStart, dayEnd),
        this.sumCommissions(dayStart, dayEnd),
        this.countBasketsSaved(dayStart, dayEnd),
      ]);

      result.push({
        date: dayStart.toISOString().split('T')[0] as string,
        revenue,
        baskets: basketCount,
        commission,
      });
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Recent activity
  // ---------------------------------------------------------------------------

  async getRecentActivity(limit: number): Promise<ActivityEvent[]> {
    const logs = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });

    return logs.map((log) => ({
      id: log.id,
      type: log.action,
      actor: log.actorId ?? 'system',
      description: `${log.action} on ${log.entityType}${log.entityId ? ` (${log.entityId})` : ''}`,
      timestamp: log.createdAt.toISOString(),
      category: this.categorizeAction(log.entityType),
    }));
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private categorizeAction(entityType: string): ActivityEvent['category'] {
    if (entityType.toLowerCase().includes('partner') || entityType.toLowerCase().includes('store')) return 'PARTNER';
    if (entityType.toLowerCase().includes('consumer') || entityType.toLowerCase().includes('user')) return 'CONSUMER';
    if (entityType.toLowerCase().includes('claim') || entityType.toLowerCase().includes('review')) return 'CLAIM';
    if (entityType.toLowerCase().includes('payment') || entityType.toLowerCase().includes('payout')) return 'FINANCE';
    if (entityType.toLowerCase().includes('fraud') || entityType.toLowerCase().includes('suspension')) return 'FRAUD';
    return 'PARTNER';
  }

  private async sumPayments(from: Date, to: Date): Promise<number> {
    const result = await this.prisma.paymentTransaction.aggregate({
      where: {
        type: 'CAPTURE',
        status: 'SUCCEEDED',
        createdAt: { gte: from, lt: to },
      },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  }

  private async sumCommissions(from: Date, to: Date): Promise<number> {
    const result = await this.prisma.paymentTransaction.aggregate({
      where: {
        type: 'CAPTURE',
        status: 'SUCCEEDED',
        createdAt: { gte: from, lt: to },
      },
      _sum: { commissionAmount: true },
    });
    return Number(result._sum.commissionAmount ?? 0);
  }

  private async countBasketsSaved(from: Date, to: Date): Promise<number> {
    return this.prisma.reservation.count({
      where: {
        status: { in: ['CONFIRMED', 'READY', 'PICKED_UP'] },
        createdAt: { gte: from, lt: to },
      },
    });
  }

  private calcGrowth(previous: number, current: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100 * 10) / 10;
  }

  private getPeriodBounds(period: string): {
    currentStart: Date;
    previousStart: Date;
    currentEnd: Date;
  } {
    const now = new Date();

    switch (period) {
      case 'today': {
        const currentStart = new Date(now);
        currentStart.setHours(0, 0, 0, 0);
        const previousStart = new Date(currentStart);
        previousStart.setDate(previousStart.getDate() - 1);
        return { currentStart, previousStart, currentEnd: now };
      }
      case 'yesterday': {
        const currentEnd = new Date(now);
        currentEnd.setHours(0, 0, 0, 0);
        const currentStart = new Date(currentEnd);
        currentStart.setDate(currentStart.getDate() - 1);
        const previousStart = new Date(currentStart);
        previousStart.setDate(previousStart.getDate() - 1);
        return { currentStart, previousStart, currentEnd };
      }
      case 'this_week': {
        const currentStart = new Date(now);
        const dayOfWeek = currentStart.getDay();
        currentStart.setDate(currentStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        currentStart.setHours(0, 0, 0, 0);
        const previousStart = new Date(currentStart);
        previousStart.setDate(previousStart.getDate() - 7);
        return { currentStart, previousStart, currentEnd: now };
      }
      case 'this_month':
      default: {
        const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return { currentStart, previousStart, currentEnd: now };
      }
    }
  }
}
