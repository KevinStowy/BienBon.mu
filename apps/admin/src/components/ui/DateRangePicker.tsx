import { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import type { PeriodFilter } from '../../api/types'
import { cn } from '../../lib/utils'

interface DateRangePickerProps {
  value: PeriodFilter
  onChange: (period: PeriodFilter, customRange?: { from: string; to: string }) => void
  className?: string
}

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: 'today', label: "Aujourd'hui" },
  { value: 'yesterday', label: 'Hier' },
  { value: 'this_week', label: 'Cette semaine' },
  { value: 'last_week', label: 'Semaine derniere' },
  { value: 'this_month', label: 'Ce mois' },
  { value: 'last_month', label: 'Mois dernier' },
  { value: 'this_quarter', label: 'Ce trimestre' },
  { value: 'this_year', label: 'Cette annee' },
  { value: 'custom', label: 'Personnalise' },
]

const SESSION_KEY = 'bienbon_admin_period'

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [showCustom, setShowCustom] = useState(value === 'custom')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY)
    if (saved && PERIOD_OPTIONS.some((o) => o.value === saved)) {
      onChange(saved as PeriodFilter)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChange = (period: PeriodFilter) => {
    sessionStorage.setItem(SESSION_KEY, period)
    setShowCustom(period === 'custom')
    if (period !== 'custom') {
      onChange(period)
    }
  }

  const handleApplyCustom = () => {
    if (customFrom && customTo) {
      sessionStorage.setItem(SESSION_KEY, 'custom')
      onChange('custom', { from: customFrom, to: customTo })
    }
  }

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      <Calendar className="w-4 h-4 text-neutral-400" aria-hidden="true" />
      <label htmlFor="period-select" className="sr-only">
        Selectionner la periode
      </label>
      <select
        id="period-select"
        value={value}
        onChange={(e) => handleChange(e.target.value as PeriodFilter)}
        className="text-sm border border-neutral-200 rounded-lg px-3 py-2 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-green-500"
        aria-label="Filtre par periode"
      >
        {PERIOD_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {showCustom ? (
        <div className="flex items-center gap-2">
          <label htmlFor="custom-from" className="sr-only">Date de debut</label>
          <input
            id="custom-from"
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="text-sm border border-neutral-200 rounded-lg px-2 py-1.5 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            aria-label="Date de debut"
          />
          <span className="text-neutral-400 text-sm">-</span>
          <label htmlFor="custom-to" className="sr-only">Date de fin</label>
          <input
            id="custom-to"
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="text-sm border border-neutral-200 rounded-lg px-2 py-1.5 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            aria-label="Date de fin"
          />
          <button
            type="button"
            onClick={handleApplyCustom}
            disabled={!customFrom || !customTo}
            className="text-sm font-semibold text-green-700 hover:text-green-900 disabled:text-neutral-400 disabled:cursor-not-allowed"
            aria-label="Appliquer la periode personnalisee"
          >
            Appliquer
          </button>
        </div>
      ) : null}
    </div>
  )
}
