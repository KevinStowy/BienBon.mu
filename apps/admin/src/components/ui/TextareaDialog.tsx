import { useState } from 'react'
import { ConfirmDialog } from './ConfirmDialog'

export interface TextareaDialogProps {
  isOpen: boolean
  title: string
  description: string
  textareaLabel?: string
  textareaPlaceholder?: string
  placeholder?: string
  minLength?: number
  required?: boolean
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
  isLoading?: boolean
  onConfirm: (text: string) => void
  onCancel: () => void
  presetOptions?: string[]
}

export function TextareaDialog({
  isOpen,
  title,
  description,
  textareaLabel,
  textareaPlaceholder,
  placeholder,
  minLength = 10,
  required = true,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
  presetOptions,
}: TextareaDialogProps) {
  const [text, setText] = useState('')
  const effectivePlaceholder = textareaPlaceholder ?? placeholder ?? ''
  const isValid = required ? text.trim().length >= minLength : true

  const handleConfirm = () => {
    if (isValid) {
      onConfirm(text.trim())
      setText('')
    }
  }

  const handleCancel = () => {
    setText('')
    onCancel()
  }

  const handlePresetSelect = (preset: string) => {
    setText(preset)
  }

  return (
    <ConfirmDialog
      isOpen={isOpen}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      variant={variant}
      isLoading={isLoading}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    >
      <div className="flex flex-col gap-3">
        {presetOptions && presetOptions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {presetOptions.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handlePresetSelect(preset)}
                className="text-xs px-2 py-1 rounded-full border border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:border-neutral-400 transition-colors"
                aria-label={`Utiliser le motif : ${preset}`}
              >
                {preset}
              </button>
            ))}
          </div>
        ) : null}
        <div>
          <label
            htmlFor="textarea-dialog-input"
            className="block text-sm font-semibold text-neutral-900 mb-1.5"
          >
            {textareaLabel}
          </label>
          <textarea
            id="textarea-dialog-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder={effectivePlaceholder}
            className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
            aria-describedby="textarea-dialog-hint"
          />
          <p id="textarea-dialog-hint" className="mt-1 text-xs text-neutral-400">
            {text.trim().length < minLength
              ? `Minimum ${minLength} caracteres (${text.trim().length}/${minLength})`
              : `${text.trim().length} caracteres`}
          </p>
        </div>
      </div>
    </ConfirmDialog>
  )
}
