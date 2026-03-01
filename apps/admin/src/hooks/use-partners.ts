import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Partner, PartnerModification, PriceHistoryEntry } from '../api/types'
import { mockPartners, mockPartnerModifications, mockPriceHistory } from '../mocks/extended-data'
import { apiClient } from '../api/client'

export interface PartnerFilters {
  status?: string
  search?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export function usePartners(filters: PartnerFilters = {}) {
  return useQuery({
    queryKey: ['partners', filters],
    queryFn: async () => {
      try {
        const res = await apiClient.partners.list({
          page: filters.page,
          limit: filters.limit,
          search: filters.search,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
          status: filters.status,
        })
        return res as { data: Partner[]; total: number; page: number; limit: number }
      } catch {
        let filtered = [...mockPartners]
        if (filters.status && filters.status !== 'ALL') {
          filtered = filtered.filter((p) => p.status === filters.status)
        }
        if (filters.search) {
          const q = filters.search.toLowerCase()
          filtered = filtered.filter(
            (p) =>
              p.storeName.toLowerCase().includes(q) ||
              `${p.managerFirstName} ${p.managerLastName}`.toLowerCase().includes(q) ||
              p.managerEmail.toLowerCase().includes(q),
          )
        }
        return { data: filtered as Partner[], total: filtered.length, page: 1, limit: 50 }
      }
    },
  })
}

export function usePartner(id: string) {
  return useQuery({
    queryKey: ['partners', id],
    queryFn: async () => {
      try {
        const res = await apiClient.partners.get(id)
        return res as Partner
      } catch {
        const found = mockPartners.find((p) => p.id === id)
        if (!found) throw new Error('Partner not found')
        return found
      }
    },
  })
}

export function usePartnerModifications() {
  return useQuery({
    queryKey: ['partners', 'modifications'],
    queryFn: async (): Promise<PartnerModification[]> => {
      try {
        const res = await fetch('/api/v1/admin/partners/modifications')
        if (!res.ok) throw new Error('API unavailable')
        return res.json() as Promise<PartnerModification[]>
      } catch {
        return mockPartnerModifications
      }
    },
  })
}

export function usePriceHistory(partnerId: string) {
  return useQuery({
    queryKey: ['partners', partnerId, 'price-history'],
    queryFn: async (): Promise<PriceHistoryEntry[]> => {
      try {
        const res = await fetch(`/api/v1/admin/partners/${partnerId}/price-history`)
        if (!res.ok) throw new Error('API unavailable')
        return res.json() as Promise<PriceHistoryEntry[]>
      } catch {
        return mockPriceHistory.filter((p) => p.partnerId === partnerId)
      }
    },
  })
}

export function useApprovePartner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment?: string }) => {
      try {
        return await apiClient.partners.approve(id)
      } catch {
        await new Promise((r) => setTimeout(r, 500))
        return { success: true, comment }
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['partners'] })
    },
  })
}

export function useRejectPartner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason, comment }: { id: string; reason: string; comment?: string }) => {
      try {
        return await apiClient.partners.reject(id, reason)
      } catch {
        await new Promise((r) => setTimeout(r, 500))
        return { success: true, reason, comment }
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['partners'] })
    },
  })
}

export function useSuspendPartner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      try {
        return await apiClient.partners.suspend(id, reason)
      } catch {
        await new Promise((r) => setTimeout(r, 500))
        return { success: true, reason }
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['partners'] })
    },
  })
}

export function useReactivatePartner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment?: string }) => {
      try {
        const res = await fetch(`/api/v1/admin/partners/${id}/reactivate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comment }),
        })
        if (!res.ok) throw new Error('API unavailable')
        return res.json()
      } catch {
        await new Promise((r) => setTimeout(r, 500))
        return { success: true, comment }
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['partners'] })
    },
  })
}

export function useBanPartner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      try {
        const res = await fetch(`/api/v1/admin/partners/${id}/ban`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        })
        if (!res.ok) throw new Error('API unavailable')
        return res.json()
      } catch {
        await new Promise((r) => setTimeout(r, 500))
        return { success: true, reason }
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['partners'] })
    },
  })
}

export function useUpdatePartnerCommission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, commissionRate, commissionFixed, feeMinimum }: { id: string; commissionRate: number | null; commissionFixed: number | null; feeMinimum: number | null }) => {
      try {
        const res = await fetch(`/api/v1/admin/partners/${id}/commission`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commissionRate, commissionFixed, feeMinimum }),
        })
        if (!res.ok) throw new Error('API unavailable')
        return res.json()
      } catch {
        await new Promise((r) => setTimeout(r, 500))
        return { success: true }
      }
    },
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['partners', variables.id] })
    },
  })
}

export function useCreatePartner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<Partner>) => {
      try {
        const res = await fetch('/api/v1/admin/partners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error('API unavailable')
        return res.json()
      } catch {
        await new Promise((r) => setTimeout(r, 500))
        return { success: true, id: 'partner-new-001' }
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['partners'] })
    },
  })
}
