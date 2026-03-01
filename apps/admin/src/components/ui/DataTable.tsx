import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { useState } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[]
  data: TData[]
  isLoading?: boolean
  emptyMessage?: string
  page?: number
  pageCount?: number
  onPageChange?: (page: number) => void
  onRowClick?: (row: TData) => void
  className?: string
}

function TableSkeleton({ columns }: { columns: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, rowIndex) => (
        <tr key={rowIndex} className="border-b border-neutral-200">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={colIndex} className="px-4 py-3">
              <div className="h-4 bg-neutral-200 rounded animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export function DataTable<TData>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'Aucune donnee disponible',
  page = 1,
  pageCount = 1,
  onPageChange,
  onRowClick,
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
  })

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table
          className="w-full text-sm"
          role="grid"
          aria-label="Tableau de donnees"
          aria-busy={isLoading}
        >
          <thead className="bg-background">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sortDir = header.column.getIsSorted()
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className={cn(
                        'px-4 py-3 text-left text-xs font-bold text-neutral-600 uppercase tracking-wider',
                        canSort &&
                          'cursor-pointer select-none hover:text-neutral-900 transition-colors',
                      )}
                      aria-sort={
                        sortDir === 'asc'
                          ? 'ascending'
                          : sortDir === 'desc'
                            ? 'descending'
                            : canSort
                              ? 'none'
                              : undefined
                      }
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <div className="flex items-center gap-1.5">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort ? (
                          <span aria-hidden="true">
                            {sortDir === 'asc' ? (
                              <ChevronUp className="w-3.5 h-3.5 text-green-700" />
                            ) : sortDir === 'desc' ? (
                              <ChevronDown className="w-3.5 h-3.5 text-green-700" />
                            ) : (
                              <ChevronsUpDown className="w-3.5 h-3.5 text-neutral-400" />
                            )}
                          </span>
                        ) : null}
                      </div>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-neutral-200">
            {isLoading ? (
              <TableSkeleton columns={columns.length} />
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-neutral-400 text-sm"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    'transition-colors duration-100',
                    onRowClick &&
                      'cursor-pointer hover:bg-background focus-visible:outline-none focus-visible:bg-background',
                  )}
                  onClick={() => onRowClick?.(row.original)}
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? 'button' : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            onRowClick(row.original)
                          }
                        }
                      : undefined
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 whitespace-nowrap text-neutral-900">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && onPageChange ? (
        <nav
          className="flex items-center justify-between"
          aria-label="Pagination"
        >
          <span className="text-sm text-neutral-600">
            Page {page} sur {pageCount}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              aria-label="Page precedente"
              className={cn(
                'p-2 rounded-lg border border-neutral-200 text-neutral-600 transition-colors',
                page <= 1
                  ? 'opacity-40 cursor-not-allowed'
                  : 'hover:bg-background hover:text-neutral-900',
              )}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
              const pageNum = i + 1
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  aria-label={`Page ${pageNum}`}
                  aria-current={page === pageNum ? 'page' : undefined}
                  className={cn(
                    'w-9 h-9 rounded-lg text-sm font-semibold transition-colors',
                    page === pageNum
                      ? 'bg-green-700 text-white'
                      : 'border border-neutral-200 text-neutral-600 hover:bg-background',
                  )}
                >
                  {pageNum}
                </button>
              )
            })}

            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= pageCount}
              aria-label="Page suivante"
              className={cn(
                'p-2 rounded-lg border border-neutral-200 text-neutral-600 transition-colors',
                page >= pageCount
                  ? 'opacity-40 cursor-not-allowed'
                  : 'hover:bg-background hover:text-neutral-900',
              )}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </nav>
      ) : null}
    </div>
  )
}
