import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn, compareDelta } from '../../lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  previousValue?: number
  currentValue?: number
  previousLabel?: string
  secondPreviousValue?: number
  secondPreviousLabel?: string
  className?: string
}

export function StatCard({
  label,
  value,
  previousValue,
  currentValue,
  previousLabel = 'vs veille',
  secondPreviousValue,
  secondPreviousLabel = 'vs semaine derniere',
  className,
}: StatCardProps) {
  const delta =
    currentValue !== undefined && previousValue !== undefined
      ? compareDelta(currentValue, previousValue)
      : undefined

  const secondDelta =
    currentValue !== undefined && secondPreviousValue !== undefined
      ? compareDelta(currentValue, secondPreviousValue)
      : undefined

  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-neutral-200 shadow-sm p-4 flex flex-col gap-2',
        className,
      )}
    >
      <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">
        {label}
      </span>
      <div className="text-2xl font-extrabold text-neutral-900">{value}</div>
      {delta !== undefined ? (
        <div className="flex flex-col gap-1">
          <DeltaDisplay delta={delta} label={previousLabel} />
          {secondDelta !== undefined ? (
            <DeltaDisplay delta={secondDelta} label={secondPreviousLabel} />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function DeltaDisplay({ delta, label }: { delta: number; label: string }) {
  const isPositive = delta > 0
  const isNegative = delta < 0

  return (
    <div className="flex items-center gap-1.5">
      {delta === 0 ? (
        <Minus className="w-3 h-3 text-neutral-400" aria-hidden="true" />
      ) : isPositive ? (
        <TrendingUp className="w-3 h-3 text-green-700" aria-hidden="true" />
      ) : (
        <TrendingDown className="w-3 h-3 text-red-700" aria-hidden="true" />
      )}
      <span
        className={cn(
          'text-xs font-semibold',
          isPositive && 'text-green-700',
          isNegative && 'text-red-700',
          delta === 0 && 'text-neutral-400',
        )}
      >
        {isPositive ? '+' : ''}{delta}%
      </span>
      <span className="text-xs text-neutral-400">{label}</span>
    </div>
  )
}
