import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Category, Tag } from '../api/types'
import { mockCategories, mockTags, mockAdminUsers } from '../mocks/extended-data'

export function useCategories() {
  return useQuery({
    queryKey: ['settings', 'categories'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/v1/admin/settings/categories')
        if (!res.ok) throw new Error('API unavailable')
        return (await res.json()) as Category[]
      } catch {
        return mockCategories
      }
    },
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<Category, 'id' | 'basketCount'>) => {
      try {
        const res = await fetch('/api/v1/admin/settings/categories', {
          method: 'POST',
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
      void qc.invalidateQueries({ queryKey: ['settings', 'categories'] })
    },
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Category> & { id: string }) => {
      try {
        const res = await fetch(`/api/v1/admin/settings/categories/${id}`, {
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
      void qc.invalidateQueries({ queryKey: ['settings', 'categories'] })
    },
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      try {
        const res = await fetch(`/api/v1/admin/settings/categories/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('API unavailable')
        return res.json()
      } catch {
        await new Promise((r) => setTimeout(r, 500))
        return { success: true }
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['settings', 'categories'] })
    },
  })
}

export function useTags() {
  return useQuery({
    queryKey: ['settings', 'tags'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/v1/admin/settings/tags')
        if (!res.ok) throw new Error('API unavailable')
        return (await res.json()) as Tag[]
      } catch {
        return mockTags
      }
    },
  })
}

export function useCreateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<Tag, 'id' | 'basketCount' | 'consumerCount'>) => {
      try {
        const res = await fetch('/api/v1/admin/settings/tags', {
          method: 'POST',
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
      void qc.invalidateQueries({ queryKey: ['settings', 'tags'] })
    },
  })
}

export function useUpdateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Tag> & { id: string }) => {
      try {
        const res = await fetch(`/api/v1/admin/settings/tags/${id}`, {
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
      void qc.invalidateQueries({ queryKey: ['settings', 'tags'] })
    },
  })
}

export function useDeleteTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      try {
        const res = await fetch(`/api/v1/admin/settings/tags/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('API unavailable')
        return res.json()
      } catch {
        await new Promise((r) => setTimeout(r, 500))
        return { success: true }
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['settings', 'tags'] })
    },
  })
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ['settings', 'admin-users'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/v1/admin/settings/admin-users')
        if (!res.ok) throw new Error('API unavailable')
        return (await res.json()) as typeof mockAdminUsers
      } catch {
        return mockAdminUsers
      }
    },
  })
}
