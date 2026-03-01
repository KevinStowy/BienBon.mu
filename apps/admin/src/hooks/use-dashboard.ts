import { useQuery } from '@tanstack/react-query'
import type { DashboardKpis, DailyFocus, RevenueDataPoint, ActivityEvent, PeriodFilter } from '../api/types'
import { mockDashboardKpis, mockDailyFocus, mockRevenueData, mockRecentActivity } from '../mocks/extended-data'

export function useKpis(period: PeriodFilter = 'today') {
  return useQuery<DashboardKpis>({
    queryKey: ['dashboard', 'kpis', period],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/v1/admin/dashboard/kpis?period=${period}`)
        if (!res.ok) throw new Error('API unavailable')
        return res.json() as Promise<DashboardKpis>
      } catch {
        return mockDashboardKpis
      }
    },
    refetchInterval: 5 * 60 * 1000,
  })
}

export function useDailyFocus() {
  return useQuery<DailyFocus>({
    queryKey: ['dashboard', 'daily-focus'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/v1/admin/dashboard/daily-focus')
        if (!res.ok) throw new Error('API unavailable')
        return res.json() as Promise<DailyFocus>
      } catch {
        return mockDailyFocus
      }
    },
    refetchInterval: 5 * 60 * 1000,
  })
}

export function useRevenueChart(period: PeriodFilter = 'this_month') {
  return useQuery<RevenueDataPoint[]>({
    queryKey: ['dashboard', 'revenue-chart', period],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/v1/admin/dashboard/revenue?period=${period}`)
        if (!res.ok) throw new Error('API unavailable')
        return res.json() as Promise<RevenueDataPoint[]>
      } catch {
        return mockRevenueData
      }
    },
  })
}

export function useRecentActivity() {
  return useQuery<ActivityEvent[]>({
    queryKey: ['dashboard', 'recent-activity'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/v1/admin/dashboard/activity')
        if (!res.ok) throw new Error('API unavailable')
        return res.json() as Promise<ActivityEvent[]>
      } catch {
        return mockRecentActivity
      }
    },
    refetchInterval: 60 * 1000,
  })
}
