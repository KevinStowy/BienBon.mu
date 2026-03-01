import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

export type AdminRole = 'ADMIN' | 'SUPER_ADMIN'

export interface AuthState {
  user: User | null
  roles: AdminRole[]
  isAdmin: boolean
  isSuperAdmin: boolean
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

function extractRoles(user: User | null): AdminRole[] {
  if (!user) return []
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const appMetadata = user.app_metadata ?? {}
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const rawRoles = appMetadata['roles'] as unknown
  if (Array.isArray(rawRoles)) {
    return rawRoles.filter(
      (r): r is AdminRole => r === 'ADMIN' || r === 'SUPER_ADMIN',
    )
  }
  return []
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setIsLoading(false)
    }).catch(() => {
      setIsLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const roles = extractRoles(user)
  const isAdmin = roles.includes('ADMIN') || roles.includes('SUPER_ADMIN')
  const isSuperAdmin = roles.includes('SUPER_ADMIN')

  return { user, roles, isAdmin, isSuperAdmin, isLoading, signIn, signOut }
}
