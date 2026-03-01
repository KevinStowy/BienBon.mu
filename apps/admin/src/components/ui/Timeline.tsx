import { cn, formatDateTime } from '../../lib/utils'

export interface TimelineItem {
  id: string
  icon?: React.ReactNode
  iconBgClass?: string
  title: string
  description?: string
  timestamp: string
  category?: string
  onClick?: () => void
}

interface TimelineProps {
  items: TimelineItem[]
  className?: string
  groupByDay?: boolean
}

function groupItemsByDay(items: TimelineItem[]): Map<string, TimelineItem[]> {
  const groups = new Map<string, TimelineItem[]>()
  for (const item of items) {
    const day = item.timestamp.slice(0, 10)
    const existing = groups.get(day)
    if (existing) {
      existing.push(item)
    } else {
      groups.set(day, [item])
    }
  }
  return groups
}

function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return "Aujourd'hui"
  if (date.toDateString() === yesterday.toDateString()) return 'Hier'

  return date.toLocaleDateString('fr-MU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function Timeline({ items, className, groupByDay = true }: TimelineProps) {
  if (items.length === 0) {
    return (
      <p className="text-center text-neutral-400 py-8 text-sm">
        Aucun evenement a afficher.
      </p>
    )
  }

  if (groupByDay) {
    const groups = groupItemsByDay(items)

    return (
      <div className={cn('flex flex-col gap-6', className)}>
        {Array.from(groups.entries()).map(([day, dayItems]) => (
          <div key={day}>
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
              {formatDayLabel(day)}
            </h3>
            <div className="relative pl-6 border-l-2 border-neutral-200">
              {dayItems.map((item) => (
                <TimelineEntry key={item.id} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('relative pl-6 border-l-2 border-neutral-200', className)}>
      {items.map((item) => (
        <TimelineEntry key={item.id} item={item} />
      ))}
    </div>
  )
}

function TimelineEntry({ item }: { item: TimelineItem }) {
  const Wrapper = item.onClick ? 'button' : 'div'
  const interactiveProps = item.onClick
    ? { onClick: item.onClick, type: 'button' as const, 'aria-label': `Voir les details : ${item.title}` }
    : {}

  return (
    <Wrapper
      {...interactiveProps}
      className={cn(
        'relative mb-4 last:mb-0 text-left w-full',
        item.onClick && 'hover:bg-neutral-50 rounded-lg p-2 -ml-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500',
      )}
    >
      <div
        className={cn(
          'absolute -left-[calc(0.75rem+1px)] top-1 w-6 h-6 rounded-full flex items-center justify-center',
          item.iconBgClass ?? 'bg-neutral-200',
        )}
        aria-hidden="true"
      >
        {item.icon ?? <div className="w-2 h-2 rounded-full bg-neutral-400" />}
      </div>
      <div className="ml-2">
        <p className="text-sm font-semibold text-neutral-900">{item.title}</p>
        {item.description ? (
          <p className="text-xs text-neutral-600 mt-0.5">{item.description}</p>
        ) : null}
        <time dateTime={item.timestamp} className="text-xs text-neutral-400 mt-0.5 block">
          {formatDateTime(item.timestamp)}
        </time>
      </div>
    </Wrapper>
  )
}
