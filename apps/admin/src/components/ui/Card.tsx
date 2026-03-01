import { cn } from '../../lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-sm border border-neutral-200 p-6',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  children,
  className,
}: CardProps) {
  return (
    <div className={cn('mb-4', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className }: CardProps) {
  return (
    <h2 className={cn('text-lg font-bold text-neutral-900', className)}>
      {children}
    </h2>
  )
}
