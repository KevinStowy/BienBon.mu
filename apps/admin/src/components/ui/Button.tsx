import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-green-700 text-white hover:bg-green-900 focus-visible:ring-green-500 disabled:bg-neutral-400',
  secondary:
    'bg-white text-green-700 border border-green-700 hover:bg-green-100 focus-visible:ring-green-500 disabled:opacity-50',
  danger:
    'bg-red-700 text-white hover:bg-red-700/90 focus-visible:ring-red-700 disabled:bg-neutral-400',
  ghost:
    'bg-transparent text-neutral-600 hover:bg-neutral-200 focus-visible:ring-neutral-400 disabled:opacity-50',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-2.5 text-base gap-2',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', isLoading = false, className, children, disabled, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled ?? isLoading}
        className={cn(
          'inline-flex items-center justify-center font-semibold rounded-lg transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {isLoading ? (
          <span
            className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
        ) : null}
        {children}
      </button>
    )
  },
)

Button.displayName = 'Button'

export { Button }
