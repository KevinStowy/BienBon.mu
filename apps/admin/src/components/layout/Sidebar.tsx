import {
  LayoutDashboard,
  Building2,
  Users,
  Shield,
  Banknote,
  ScrollText,
  AlertTriangle,
  Settings,
} from 'lucide-react'
import { Link, useRouterState } from '@tanstack/react-router'
import { cn } from '../../lib/utils'
import { mockPartners, mockClaims, mockFraudAlerts } from '../../mocks/extended-data'

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
  badge?: number
  ariaLabel: string
}

function getNavItems(): NavItem[] {
  const pendingPartners = mockPartners.filter((p) => p.status === 'PENDING').length
  const openClaims = mockClaims.filter((c) => c.status === 'OPEN').length
  const activeFraudAlerts = mockFraudAlerts.filter(
    (f) => f.status === 'NEW' || f.status === 'INVESTIGATING',
  ).length

  return [
    {
      label: 'Tableau de bord',
      to: '/',
      icon: <LayoutDashboard className="w-5 h-5" aria-hidden="true" />,
      ariaLabel: 'Tableau de bord',
    },
    {
      label: 'Partenaires',
      to: '/partners',
      icon: <Building2 className="w-5 h-5" aria-hidden="true" />,
      badge: pendingPartners > 0 ? pendingPartners : undefined,
      ariaLabel: `Partenaires${pendingPartners > 0 ? `, ${pendingPartners} en attente` : ''}`,
    },
    {
      label: 'Consommateurs',
      to: '/consumers',
      icon: <Users className="w-5 h-5" aria-hidden="true" />,
      ariaLabel: 'Consommateurs',
    },
    {
      label: 'Moderation',
      to: '/moderation',
      icon: <Shield className="w-5 h-5" aria-hidden="true" />,
      badge: openClaims > 0 ? openClaims : undefined,
      ariaLabel: `Moderation${openClaims > 0 ? `, ${openClaims} reclamations ouvertes` : ''}`,
    },
    {
      label: 'Finance',
      to: '/finance',
      icon: <Banknote className="w-5 h-5" aria-hidden="true" />,
      ariaLabel: 'Finance',
    },
    {
      label: 'Audit',
      to: '/audit',
      icon: <ScrollText className="w-5 h-5" aria-hidden="true" />,
      ariaLabel: 'Audit',
    },
    {
      label: 'Fraude',
      to: '/fraud',
      icon: <AlertTriangle className="w-5 h-5" aria-hidden="true" />,
      badge: activeFraudAlerts > 0 ? activeFraudAlerts : undefined,
      ariaLabel: `Fraude${activeFraudAlerts > 0 ? `, ${activeFraudAlerts} alertes actives` : ''}`,
    },
    {
      label: 'Parametres',
      to: '/settings',
      icon: <Settings className="w-5 h-5" aria-hidden="true" />,
      ariaLabel: 'Parametres',
    },
  ]
}

export function Sidebar() {
  const router = useRouterState()
  const currentPath = router.location.pathname
  const navItems = getNavItems()

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 w-60 bg-white border-r border-neutral-200 shadow-sm flex flex-col z-30"
      aria-label="Navigation principale"
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-neutral-200">
        <div className="w-8 h-8 bg-green-700 rounded-lg flex items-center justify-center">
          <span className="text-white font-extrabold text-sm" aria-hidden="true">BB</span>
        </div>
        <div>
          <span className="font-extrabold text-green-900 text-base leading-none">BienBon</span>
          <span className="block text-xs text-neutral-600 font-semibold mt-0.5">Administration</span>
        </div>
      </div>

      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-green-700 text-white px-3 py-1.5 rounded text-sm z-50"
      >
        Aller au contenu principal
      </a>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto" role="navigation">
        <ul role="list" className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive =
              item.to === '/'
                ? currentPath === '/'
                : currentPath.startsWith(item.to)
            return (
              <li key={item.to} role="listitem">
                <Link
                  to={item.to}
                  aria-label={item.ariaLabel}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500',
                    isActive
                      ? 'bg-green-700 text-white'
                      : 'text-neutral-600 hover:bg-background hover:text-neutral-900',
                  )}
                >
                  <span className="flex items-center gap-3">
                    {item.icon}
                    {item.label}
                  </span>
                  {item.badge !== undefined ? (
                    <span
                      className={cn(
                        'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold',
                        isActive
                          ? 'bg-white/30 text-white'
                          : 'bg-orange-600 text-white',
                      )}
                      aria-hidden="true"
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-neutral-200">
        <p className="text-xs text-neutral-400">BienBon.mu &copy; 2026</p>
      </div>
    </aside>
  )
}
