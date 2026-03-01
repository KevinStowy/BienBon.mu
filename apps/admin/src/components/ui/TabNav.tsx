import { cn } from '../../lib/utils'

export interface TabItem {
  id: string
  label: string
  badge?: number
}

interface TabNavProps {
  tabs: TabItem[]
  activeTab: string
  onChange: (id: string) => void
  className?: string
}

export function TabNav({ tabs, activeTab, onChange, className }: TabNavProps) {
  return (
    <nav
      role="tablist"
      aria-label="Navigation par onglets"
      className={cn('flex gap-0 border-b border-neutral-200', className)}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`tabpanel-${tab.id}`}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-inset',
            activeTab === tab.id
              ? 'border-green-700 text-green-700'
              : 'border-transparent text-neutral-600 hover:text-neutral-900 hover:border-neutral-200',
          )}
        >
          {tab.label}
          {tab.badge !== undefined && tab.badge > 0 ? (
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-600 text-white text-xs font-bold"
              aria-label={`${tab.badge} elements`}
            >
              {tab.badge}
            </span>
          ) : null}
        </button>
      ))}
    </nav>
  )
}
