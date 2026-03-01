import { supabase } from '../auth/supabase'

const API_BASE = import.meta.env['VITE_API_URL'] as string | undefined ?? '/api'

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (token) {
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  }
  return { 'Content-Type': 'application/json' }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers as Record<string, string> | undefined),
    },
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`API ${response.status}: ${errorText}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface PaginationParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export const apiClient = {
  partners: {
    list: (params: PaginationParams & { status?: string }) =>
      apiFetch<PaginatedResponse<unknown>>(
        `/v1/admin/partners?${new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)]),
        )}`,
      ),
    get: (id: string) => apiFetch<unknown>(`/v1/admin/partners/${id}`),
    approve: (id: string) =>
      apiFetch<unknown>(`/v1/admin/partners/${id}/approve`, { method: 'POST' }),
    reject: (id: string, reason: string) =>
      apiFetch<unknown>(`/v1/admin/partners/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    suspend: (id: string, reason: string) =>
      apiFetch<unknown>(`/v1/admin/partners/${id}/suspend`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
  },
  consumers: {
    list: (params: PaginationParams & { status?: string }) =>
      apiFetch<PaginatedResponse<unknown>>(
        `/v1/admin/consumers?${new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)]),
        )}`,
      ),
    get: (id: string) => apiFetch<unknown>(`/v1/admin/consumers/${id}`),
    suspend: (id: string, reason: string) =>
      apiFetch<unknown>(`/v1/admin/consumers/${id}/suspend`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
  },
  claims: {
    list: (params: PaginationParams & { status?: string }) =>
      apiFetch<PaginatedResponse<unknown>>(
        `/v1/admin/claims?${new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)]),
        )}`,
      ),
    get: (id: string) => apiFetch<unknown>(`/v1/admin/claims/${id}`),
    resolve: (id: string, resolution: string) =>
      apiFetch<unknown>(`/v1/admin/claims/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ resolution }),
      }),
  },
  dashboard: {
    kpis: () => apiFetch<unknown>('/v1/admin/dashboard/kpis'),
    revenueChart: (days = 30) =>
      apiFetch<unknown>(`/v1/admin/dashboard/revenue?days=${days}`),
  },
}
