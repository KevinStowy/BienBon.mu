import { Star } from 'lucide-react'
import { cn } from '../../lib/utils'

interface RatingStarsProps {
  rating: number
  maxStars?: number
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
}

export function RatingStars({
  rating,
  maxStars = 5,
  size = 'md',
  showValue = true,
  className,
}: RatingStarsProps) {
  return (
    <div
      className={cn('inline-flex items-center gap-1', className)}
      role="img"
      aria-label={`Note : ${rating} sur ${maxStars}`}
    >
      {Array.from({ length: maxStars }, (_, i) => {
        const filled = i < Math.floor(rating)
        const halfFilled = !filled && i < rating
        return (
          <Star
            key={i}
            className={cn(
              sizeClasses[size],
              filled
                ? 'text-orange-500 fill-orange-500'
                : halfFilled
                  ? 'text-orange-500 fill-orange-500/50'
                  : 'text-neutral-200 fill-neutral-200',
            )}
            aria-hidden="true"
          />
        )
      })}
      {showValue ? (
        <span className="text-sm font-bold text-neutral-900 ml-0.5">
          {rating > 0 ? rating.toFixed(1) : '-'}
        </span>
      ) : null}
    </div>
  )
}
