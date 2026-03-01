import { useEffect, useRef } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { Button } from './Button'
import { cn } from '../../lib/utils'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
  children?: React.ReactNode
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) {
      confirmButtonRef.current?.focus()
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        className={cn(
          'relative bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6',
          'animate-in fade-in-0 zoom-in-95 duration-200',
        )}
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-900 transition-colors"
          aria-label="Fermer le dialogue"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-700" aria-hidden="true" />
          </div>
          <div>
            <h3 id="dialog-title" className="text-base font-bold text-neutral-900">
              {title}
            </h3>
            <p id="dialog-description" className="mt-1 text-sm text-neutral-600">
              {description}
            </p>
          </div>
        </div>

        {children ? <div className="mb-4">{children}</div> : null}

        <div className="flex gap-3 justify-end mt-6">
          <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            ref={confirmButtonRef}
            variant={variant}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
