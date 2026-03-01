import {
  createRootRouteWithContext,
  Outlet,
  Navigate,
  useRouterState,
} from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { AppLayout } from '../components/layout/AppLayout'
import { useAuth } from '../auth/use-auth'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
})

function LoadingScreen() {
  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center"
      role="status"
      aria-label="Chargement en cours"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 bg-green-700 rounded-xl flex items-center justify-center animate-pulse">
          <span className="text-white font-extrabold text-lg" aria-hidden="true">BB</span>
        </div>
        <p className="text-sm text-neutral-600 font-semibold">Chargement...</p>
      </div>
    </div>
  )
}

function RootComponent() {
  const { user, isLoading } = useAuth()
  const location = useRouterState({ select: (s) => s.location })
  const isLoginPage = location.pathname === '/login'

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!user && !isLoginPage) {
    return <Navigate to="/login" />
  }

  if (isLoginPage) {
    return <Outlet />
  }

  return <AppLayout />
}
