import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '../../lib/utils'

interface KpiCardProps {
  label: string
  value: string
  trend: number
  trendLabel?: string
  icon?: React.ReactNode
  className?: string
}

export function KpiCard({
  label,
  value,
  trend,
  trendLabel,
  icon,
  className,
}: KpiCardProps) {
  const isPositive = trend > 0
  const isNegative = trend < 0
  const isNeutral = trend === 0

  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-neutral-200 shadow-sm p-5 flex flex-col gap-3',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-neutral-600 uppercase tracking-wide">
          {label}
        </span>
        {icon ? (
          <span className="text-green-500" aria-hidden="true">
            {icon}
          </span>
        ) : null}
      </div>

      <div className="text-3xl font-extrabold text-neutral-900">{value}</div>

      <div className="flex items-center gap-1.5">
        {isNeutral ? (
          <Minus className="w-4 h-4 text-neutral-400" aria-hidden="true" />
        ) : isPositive ? (
          <TrendingUp className="w-4 h-4 text-green-700" aria-hidden="true" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-700" aria-hidden="true" />
        )}
        <span
          className={cn(
            'text-sm font-semibold',
            isPositive && 'text-green-700',
            isNegative && 'text-red-700',
            isNeutral && 'text-neutral-400',
          )}
        >
          {isPositive ? '+' : ''}{trend.toFixed(1)}%
        </span>
        {trendLabel ? (
          <span className="text-xs text-neutral-400">{trendLabel}</span>
        ) : null}
      </div>
    </div>
  )
}
