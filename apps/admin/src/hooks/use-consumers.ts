import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Consumer } from '../api/types'
import { mockConsumers } from '../mocks/extended-data'

export interface ConsumerFilters {
  status?: string
  search?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  activityFilter?: string
}

export function useConsumers(filters: ConsumerFilters = {}) {
  return useQuery({
    queryKey: ['consumers', filters],
    queryFn: async () => {
      try {
        const params = new URLSearchParams(
          Object.entries(filters)
            .filter(([, v]) => v !== undefined && v !== '' && v !== 'ALL')
            .map(([k, v]) => [k, String(v)]),
        )
        const res = await fetch(`/api/v1/admin/consumers?${params}`)
        if (!res.ok) throw new Error('API unavailable')
        return (await res.json()) as { data: Consumer[]; total: number }
      } catch {
        let filtered = [...mockConsumers]
        if (filters.status && filters.status !== 'ALL') {
          filtered = filtered.filter((c) => c.status === filters.status)
        }
        if (filters.search) {
          const q = filters.search.toLowerCase()
          filtered = filtered.filter(
            (c) =>
              c.firstName.toLowerCase().includes(q) ||
              c.lastName.toLowerCase().includes(q) ||
              c.email.toLowerCase().includes(q) ||
              c.phone.includes(q),
          )
        }
        return { data: filtered, total: filtered.length }
      }
    },
  })
}

export function useConsumer(id: string) {
  return useQuery({
    queryKey: ['consumers', id],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/v1/admin/consumers/${id}`)
        if (!res.ok) throw new Error('API unavailable')
        return (await res.json()) as Consumer
      } catch {
        const found = mockConsumers.find((c) => c.id === id)
        if (!found) throw new Error('Consumer not found')
        return found
      }
    },
  })
}

export function useSuspendConsumer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      try {
        const res = await fetch(`/api/v1/admin/consumers/${id}/suspend`, {
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
      void qc.invalidateQueries({ queryKey: ['consumers'] })
    },
  })
}

export function useReactivateConsumer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment?: string }) => {
      try {
        const res = await fetch(`/api/v1/admin/consumers/${id}/reactivate`, {
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
      void qc.invalidateQueries({ queryKey: ['consumers'] })
    },
  })
}

export function useBanConsumer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      try {
        const res = await fetch(`/api/v1/admin/consumers/${id}/ban`, {
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
      void qc.invalidateQueries({ queryKey: ['consumers'] })
    },
  })
}
