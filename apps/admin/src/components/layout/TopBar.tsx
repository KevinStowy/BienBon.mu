import { LogOut, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../auth/use-auth'
import { cn } from '../../lib/utils'

export function TopBar() {
  const { user, isSuperAdmin, signOut } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const displayName = user?.user_metadata?.['full_name'] as string | undefined
    ?? user?.email?.split('@')[0]
    ?? 'Admin'

  const roleLabel = isSuperAdmin ? 'Super Admin' : 'Admin'

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <header
      className="fixed top-0 left-60 right-0 h-14 bg-white border-b border-neutral-200 z-20 flex items-center justify-between px-6"
      role="banner"
    >
      <div id="breadcrumb-region" aria-label="Fil d'Ariane" />

      <div className="flex items-center gap-3 ml-auto">
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
            aria-label={`Menu utilisateur : ${displayName}`}
            className={cn(
              'flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors',
              'hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500',
            )}
          >
            <div className="w-8 h-8 rounded-full bg-green-100 border-2 border-green-500 flex items-center justify-center">
              <span className="text-xs font-bold text-green-700" aria-hidden="true">
                {displayName.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-neutral-900 leading-none">{displayName}</p>
              <p className="text-xs text-neutral-600 mt-0.5">{roleLabel}</p>
            </div>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-neutral-400 transition-transform duration-150',
                isMenuOpen && 'rotate-180',
              )}
              aria-hidden="true"
            />
          </button>

          {isMenuOpen ? (
            <div
              role="menu"
              aria-label="Menu utilisateur"
              className={cn(
                'absolute right-0 top-full mt-2 w-48 bg-white border border-neutral-200 rounded-lg shadow-md py-1',
                'animate-in fade-in-0 slide-in-from-top-2 duration-150',
              )}
            >
              <div className="px-3 py-2 border-b border-neutral-200">
                <p className="text-xs text-neutral-400">Connecte en tant que</p>
                <p className="text-sm font-semibold text-neutral-900 truncate">{user?.email}</p>
              </div>
              <button
                role="menuitem"
                onClick={() => { void handleSignOut() }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm text-red-700 font-semibold',
                  'hover:bg-red-100 transition-colors',
                  'focus-visible:outline-none focus-visible:bg-red-100',
                )}
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                Se deconnecter
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
