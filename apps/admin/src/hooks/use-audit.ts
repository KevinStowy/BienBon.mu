import { useQuery } from '@tanstack/react-query'
import type { AuditEntry, AuditCategory } from '../api/types'
import { mockAuditEntries } from '../mocks/extended-data'

export interface AuditFilters {
  search?: string
  category?: AuditCategory | 'ALL'
  userId?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

export function useAuditLog(filters: AuditFilters = {}) {
  return useQuery({
    queryKey: ['audit', filters],
    queryFn: async () => {
      try {
        const params = new URLSearchParams(
          Object.entries(filters)
            .filter(([, v]) => v !== undefined && v !== '' && v !== 'ALL')
            .map(([k, v]) => [k, String(v)]),
        )
        const res = await fetch(`/api/v1/admin/audit?${params}`)
        if (!res.ok) throw new Error('API unavailable')
        return (await res.json()) as { data: AuditEntry[]; total: number }
      } catch {
        let filtered = [...mockAuditEntries]
        if (filters.category && filters.category !== 'ALL') {
          filtered = filtered.filter((e) => e.category === filters.category)
        }
        if (filters.search) {
          const q = filters.search.toLowerCase()
          filtered = filtered.filter(
            (e) =>
              e.userName.toLowerCase().includes(q) ||
              e.userEmail.toLowerCase().includes(q) ||
              e.userIdDisplay.toLowerCase().includes(q) ||
              e.summary.toLowerCase().includes(q) ||
              e.details.toLowerCase().includes(q),
          )
        }
        if (filters.userId) {
          filtered = filtered.filter((e) => e.userId === filters.userId)
        }
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        return { data: filtered, total: filtered.length }
      }
    },
    refetchInterval: 30 * 1000,
  })
}

export function useAuditEntry(id: string) {
  return useQuery({
    queryKey: ['audit', id],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/v1/admin/audit/${id}`)
        if (!res.ok) throw new Error('API unavailable')
        return (await res.json()) as AuditEntry
      } catch {
        const found = mockAuditEntries.find((e) => e.id === id)
        if (!found) throw new Error('Audit entry not found')
        return found
      }
    },
  })
}

export function useUserTimeline(userId: string) {
  return useQuery({
    queryKey: ['audit', 'timeline', userId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/v1/admin/audit/timeline/${userId}`)
        if (!res.ok) throw new Error('API unavailable')
        return (await res.json()) as AuditEntry[]
      } catch {
        return mockAuditEntries
          .filter((e) => e.userId === userId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      }
    },
  })
}
