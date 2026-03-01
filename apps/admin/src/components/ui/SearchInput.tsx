import { useState, useEffect, useRef, type InputHTMLAttributes } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '../../lib/utils'

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onChange: (value: string) => void
  debounceMs?: number
  placeholder?: string
  className?: string
}

export function SearchInput({
  onChange,
  debounceMs = 300,
  placeholder = 'Rechercher...',
  className,
  value: externalValue,
  ...props
}: SearchInputProps) {
  const [internalValue, setInternalValue] = useState(
    typeof externalValue === 'string' ? externalValue : '',
  )
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => {
      onChange(internalValue)
    }, debounceMs)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [internalValue, onChange, debounceMs])

  const handleClear = () => {
    setInternalValue('')
    onChange('')
  }

  return (
    <div className={cn('relative flex items-center', className)}>
      <Search
        className="absolute left-3 w-4 h-4 text-neutral-400 pointer-events-none"
        aria-hidden="true"
      />
      <input
        type="search"
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(
          'w-full pl-9 pr-9 py-2 text-sm rounded-lg border border-neutral-200 bg-white',
          'placeholder:text-neutral-400 text-neutral-900',
          'focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent',
          'transition-colors duration-150',
        )}
        {...props}
      />
      {internalValue ? (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Effacer la recherche"
          className="absolute right-3 text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      ) : null}
    </div>
  )
}
