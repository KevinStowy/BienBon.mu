import { cn } from '../../lib/utils'

interface DiffField {
  field: string
  label: string
  oldValue: string
  newValue: string
  status?: 'PENDING' | 'APPROVED' | 'REJECTED'
}

interface DiffViewProps {
  fields: DiffField[]
  className?: string
}

export function DiffView({ fields, className }: DiffViewProps) {
  if (fields.length === 0) {
    return (
      <p className="text-sm text-neutral-400 py-4 text-center">
        Aucune modification.
      </p>
    )
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {fields.map((field) => (
        <div
          key={field.field}
          className={cn(
            'rounded-lg border p-4',
            field.status === 'APPROVED' && 'border-green-500 bg-green-100/30',
            field.status === 'REJECTED' && 'border-red-700 bg-red-100/30',
            (!field.status || field.status === 'PENDING') && 'border-neutral-200 bg-white',
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
              {field.label}
            </span>
            {field.status ? (
              <span
                className={cn(
                  'text-xs font-semibold px-2 py-0.5 rounded-full',
                  field.status === 'PENDING' && 'bg-orange-100 text-orange-600',
                  field.status === 'APPROVED' && 'bg-green-100 text-green-700',
                  field.status === 'REJECTED' && 'bg-red-100 text-red-700',
                )}
              >
                {field.status === 'PENDING'
                  ? 'En attente'
                  : field.status === 'APPROVED'
                    ? 'Approuve'
                    : 'Rejete'}
              </span>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-neutral-400 block mb-1">Avant</span>
              <div className="text-sm text-neutral-900 bg-red-100/40 rounded p-2 border border-red-100">
                {field.oldValue || <span className="text-neutral-400 italic">Vide</span>}
              </div>
            </div>
            <div>
              <span className="text-xs text-neutral-400 block mb-1">Apres</span>
              <div className="text-sm text-neutral-900 bg-green-100/40 rounded p-2 border border-green-100">
                {field.newValue || <span className="text-neutral-400 italic">Vide</span>}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
