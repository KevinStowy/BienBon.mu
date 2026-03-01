import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Claim, Review, ResolutionType } from '../api/types'
import { mockClaims, mockReviews } from '../mocks/extended-data'

export interface ClaimFilters {
  status?: string
  partnerId?: string
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export function useClaims(filters: ClaimFilters = {}) {
  return useQuery({
    queryKey: ['claims', filters],
    queryFn: async () => {
      try {
        const params = new URLSearchParams(
          Object.entries(filters)
            .filter(([, v]) => v !== undefined && v !== '' && v !== 'ALL')
            .map(([k, v]) => [k, String(v)]),
        )
        const res = await fetch(`/api/v1/admin/claims?${params}`)
        if (!res.ok) throw new Error('API unavailable')
        return (await res.json()) as { data: Claim[]; total: number }
      } catch {
        let filtered = [...mockClaims]
        if (filters.status && filters.status !== 'ALL') {
          filtered = filtered.filter((c) => c.status === filters.status)
        }
        if (filters.partnerId) {
          filtered = filtered.filter((c) => c.partnerId === filters.partnerId)
        }
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        return { data: filtered, total: filtered.length }
      }
    },
  })
}

export function useClaim(id: string) {
  return useQuery({
    queryKey: ['claims', id],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/v1/admin/claims/${id}`)
        if (!res.ok) throw new Error('API unavailable')
        return (await res.json()) as Claim
      } catch {
        const found = mockClaims.find((c) => c.id === id)
        if (!found) throw new Error('Claim not found')
        return found
      }
    },
  })
}

export function useResolveClaim() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, type, amount, comment }: { id: string; type: ResolutionType; amount: number | null; comment: string }) => {
      try {
        const res = await fetch(`/api/v1/admin/claims/${id}/resolve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, amount, comment }),
        })
        if (!res.ok) throw new Error('API unavailable')
        return res.json()
      } catch {
        await new Promise((r) => setTimeout(r, 500))
        return { success: true }
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['claims'] })
    },
  })
}

export function useAssignClaim() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      try {
        const res = await fetch(`/api/v1/admin/claims/${id}/assign`, { method: 'POST' })
        if (!res.ok) throw new Error('API unavailable')
        return res.json()
      } catch {
        await new Promise((r) => setTimeout(r, 300))
        return { success: true }
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['claims'] })
    },
  })
}

export function useReviews(filters: { partnerId?: string; rating?: number; search?: string } = {}) {
  return useQuery({
    queryKey: ['reviews', filters],
    queryFn: async () => {
      try {
        const params = new URLSearchParams(
          Object.entries(filters)
            .filter(([, v]) => v !== undefined && v !== '')
            .map(([k, v]) => [k, String(v)]),
        )
        const res = await fetch(`/api/v1/admin/reviews?${params}`)
        if (!res.ok) throw new Error('API unavailable')
        return (await res.json()) as { data: Review[]; total: number }
      } catch {
        let filtered = [...mockReviews]
        if (filters.partnerId) {
          filtered = filtered.filter((r) => r.partnerId === filters.partnerId)
        }
        if (filters.rating !== undefined) {
          filtered = filtered.filter((r) => r.rating === filters.rating)
        }
        return { data: filtered, total: filtered.length }
      }
    },
  })
}

export function useDeleteReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      try {
        const res = await fetch(`/api/v1/admin/reviews/${id}`, {
          method: 'DELETE',
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
      void qc.invalidateQueries({ queryKey: ['reviews'] })
    },
  })
}
