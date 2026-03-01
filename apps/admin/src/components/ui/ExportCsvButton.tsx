import { Download } from 'lucide-react'
import { Button } from './Button'
import { downloadCsv } from '../../lib/utils'

interface CsvColumn<T> {
  key: keyof T & string
  label: string
}

export interface ExportCsvButtonProps {
  filename: string
  label?: string
  disabled?: boolean
  // Option 1: pre-computed headers + rows
  headers?: string[]
  rows?: string[][]
  // Option 2: data + columns (auto-extracts headers/rows)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns?: CsvColumn<any>[]
}

export function ExportCsvButton({
  filename,
  label = 'Export CSV',
  disabled = false,
  headers: rawHeaders,
  rows: rawRows,
  data,
  columns,
}: ExportCsvButtonProps) {
  const handleExport = () => {
    let headers: string[]
    let rows: string[][]

    if (data && columns) {
      headers = columns.map((c) => c.label)
      rows = data.map((item) =>
        columns.map((c) => String(item[c.key] ?? '')),
      )
    } else if (rawHeaders && rawRows) {
      headers = rawHeaders
      rows = rawRows
    } else {
      return
    }

    downloadCsv(filename, headers, rows)
  }

  const rowCount = rawRows?.length ?? data?.length ?? 0

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleExport}
      disabled={disabled || rowCount === 0}
      aria-label={`Exporter ${rowCount} lignes en CSV`}
    >
      <Download className="w-4 h-4" aria-hidden="true" />
      {label}
    </Button>
  )
}
