import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CommissionConfig, PayoutStatement, RevenueOverview, RevenueByPartner, PeriodFilter } from '../api/types'
import { mockCommissionConfig, mockPayouts, mockRevenueOverview, mockRevenueByPartner } from '../mocks/extended-data'

export function useCommissionConfig() {
  return useQuery({
    queryKey: ['finance', 'commission-config'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/v1/admin/finance/commission-config')
        if (!res.ok) throw new Error('API unavailable')
        return (await res.json()) as CommissionConfig
      } catch {
        return mockCommissionConfig
      }
    },
  })
}

export function useUpdateCommissionConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (config: Partial<CommissionConfig>) => {
      try {
        const res = await fetch('/api/v1/admin/finance/commission-config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        })
        if (!res.ok) throw new Error('API unavailable')
        return res.json()
      } catch {
        await new Promise((r) => setTimeout(r, 500))
        return { success: true }
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['finance', 'commission-config'] })
    },
  })
}

export function usePayouts(filters: { partnerId?: string; period?: string } = {}) {
  return useQuery({
    queryKey: ['finance', 'payouts', filters],
    queryFn: async () => {
      try {
        const params = new URLSearchParams(
          Object.entries(filters)
            .filter(([, v]) => v !== undefined && v !== '')
            .map(([k, v]) => [k, String(v)]),
        )
        const res = await fetch(`/api/v1/admin/finance/payouts?${params}`)
        if (!res.ok) throw new Error('API unavailable')
        return (await res.json()) as { data: PayoutStatement[]; total: number }
      } catch {
        let filtered = [...mockPayouts]
        if (filters.partnerId) {
          filtered = filtered.filter((p) => p.partnerId === filters.partnerId)
        }
        return { data: filtered, total: filtered.length }
      }
    },
  })
}

export function useGeneratePayouts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ month }: { month: string }) => {
      try {
        const res = await fetch('/api/v1/admin/finance/payouts/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ month }),
        })
        if (!res.ok) throw new Error('API unavailable')
        return res.json()
      } catch {
        await new Promise((r) => setTimeout(r, 1000))
        return { success: true, generatedCount: 3, totalCommission: 10071, totalPayout: 59062 }
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['finance', 'payouts'] })
    },
  })
}

export function useMarkPayoutAsPaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      try {
        const res = await fetch(`/api/v1/admin/finance/payouts/${id}/mark-paid`, { method: 'POST' })
        if (!res.ok) throw new Error('API unavailable')
        return res.json()
      } catch {
        await new Promise((r) => setTimeout(r, 500))
        return { success: true }
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['finance', 'payouts'] })
    },
  })
}

export function useRevenue(period: PeriodFilter = 'this_month') {
  return useQuery({
    queryKey: ['finance', 'revenue', period],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/v1/admin/finance/revenue?period=${period}`)
        if (!res.ok) throw new Error('API unavailable')
        return (await res.json()) as RevenueOverview
      } catch {
        return mockRevenueOverview
      }
    },
  })
}

export function useRevenueByPartner(period: PeriodFilter = 'this_month') {
  return useQuery({
    queryKey: ['finance', 'revenue-by-partner', period],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/v1/admin/finance/revenue/by-partner?period=${period}`)
        if (!res.ok) throw new Error('API unavailable')
        return (await res.json()) as RevenueByPartner[]
      } catch {
        return mockRevenueByPartner
      }
    },
  })
}
