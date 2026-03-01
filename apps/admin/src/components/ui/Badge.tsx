import { cn } from '../../lib/utils'

export type BadgeVariant =
  | 'active'
  | 'pending'
  | 'suspended'
  | 'banned'
  | 'rejected'
  | 'resolved'
  | 'open'
  | 'in_review'
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'
  | 'default'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-orange-100 text-orange-600',
  suspended: 'bg-neutral-200 text-neutral-600',
  banned: 'bg-red-100 text-red-700',
  rejected: 'bg-red-100 text-red-700',
  resolved: 'bg-blue-100 text-blue-700',
  open: 'bg-red-100 text-red-700',
  in_review: 'bg-orange-100 text-orange-600',
  low: 'bg-green-100 text-green-700',
  medium: 'bg-orange-100 text-orange-600',
  high: 'bg-red-100 text-red-700',
  critical: 'bg-red-700 text-white',
  default: 'bg-neutral-200 text-neutral-900',
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function statusToBadgeVariant(
  status: string,
): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    ACTIVE: 'active',
    PENDING: 'pending',
    SUSPENDED: 'suspended',
    BANNED: 'banned',
    REJECTED: 'rejected',
    RESOLVED: 'resolved',
    OPEN: 'open',
    IN_REVIEW: 'in_review',
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
    INVESTIGATING: 'in_review',
    DISMISSED: 'suspended',
  }
  return map[status] ?? 'default'
}
