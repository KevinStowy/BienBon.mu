import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { FraudAlert, DuplicateAccount, ThresholdAlert, ThresholdRule } from '../api/types'
import { mockFraudAlerts, mockDuplicates, mockThresholdAlerts, mockThresholdRules } from '../mocks/extended-data'

export interface FraudFilters {
  entityType?: 'CONSUMER' | 'PARTNER' | 'ALL'
  status?: string
  type?: string
}

export function useFraudAlerts(filters: FraudFilters = {}) {
  return useQuery({
    queryKey: ['fraud', 'alerts', filters],
    queryFn: async () => {
      try {
        const params = new URLSearchParams(
          Object.entries(filters)
            .filter(([, v]) => v !== undefined && v !== '' && v !== 'ALL')
            .map(([k, v]) => [k, String(v)]),
        )
        const res = await fetch(`/api/v1/admin/fraud/alerts?${params}`)
        if (!res.ok) throw new Error('API unavailable')
        return (await res.json()) as { data: FraudAlert[]; total: number }
      } catch {
        let filtered = [...mockFraudAlerts]
        if (filters.entityType && filters.entityType !== 'ALL') {
          filtered = filtered.filter((f) => f.entityType === filters.entityType)
        }
        if (filters.status && filters.status !== 'ALL') {
          filtered = filtered.filter((f) => f.status === filters.status)
        }
        return { data: filtered, total: filtered.length }
      }
    },
  })
}

export function useUpdateFraudAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status, comment }: { id: string; status: string; comment?: string }) => {
      try {
        const res = await fetch(`/api/v1/admin/fraud/alerts/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, comment }),
        })
        if (!res.ok) throw new Error('API unavailable')
        return res.json()
      } catch {
        await new Promise((r) => setTimeout(r, 500))
        return { success: true }
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['fraud'] })
    },
  })
}

export function useDuplicateAccounts() {
  return useQuery({
    queryKey: ['fraud', 'duplicates'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/v1/admin/fraud/duplicates')
        if (!res.ok) throw new Error('API unavailable')
        return (await res.json()) as { data: DuplicateAccount[]; total: number }
      } catch {
        return { data: mockDuplicates, total: mockDuplicates.length }
      }
    },
  })
}

export function useMergeAccounts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ duplicateId, primaryAccountId }: { duplicateId: string; primaryAccountId: string }) => {
      try {
        const res = await fetch(`/api/v1/admin/fraud/duplicates/${duplicateId}/merge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ primaryAccountId }),
        })
        if (!res.ok) throw new Error('API unavailable')
        return res.json()
      } catch {
        await new Promise((r) => setTimeout(r, 800))
        return { success: true }
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['fraud', 'duplicates'] })
    },
  })
}

export function useThresholdAlerts() {
  return useQuery({
    queryKey: ['fraud', 'threshold-alerts'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/v1/admin/fraud/threshold-alerts')
        if (!res.ok) throw new Error('API unavailable')
        return (await res.json()) as ThresholdAlert[]
      } catch {
        return mockThresholdAlerts
      }
    },
  })
}

export function useThresholdRules() {
  return useQuery({
    queryKey: ['fraud', 'threshold-rules'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/v1/admin/fraud/threshold-rules')
        if (!res.ok) throw new Error('API unavailable')
        return (await res.json()) as ThresholdRule[]
      } catch {
        return mockThresholdRules
      }
    },
  })
}

export function useUpdateThresholdRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<ThresholdRule> & { id: string }) => {
      try {
        const res = await fetch(`/api/v1/admin/fraud/threshold-rules/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error('API unavailable')
        return res.json()
      } catch {
        await new Promise((r) => setTimeout(r, 500))
        return { success: true }
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['fraud', 'threshold-rules'] })
    },
  })
}
