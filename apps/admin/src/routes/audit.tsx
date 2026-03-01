import { createRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { DataTable } from '../components/ui/DataTable'
import { SearchInput } from '../components/ui/SearchInput'
import { mockAuditEntries, type MockAuditEntry } from '../mocks/data'
import { formatDateTime } from '../lib/utils'
import { Route as rootRoute } from './__root'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/audit',
  component: AuditPage,
})

const columnHelper = createColumnHelper<MockAuditEntry>()

const categoryColors: Record<MockAuditEntry['category'], string> = {
  AUTH: 'bg-[#E3F2FD] text-[#1565C0]',
  PARTNER: 'bg-[#E8F5E9] text-[#2E7D32]',
  CONSUMER: 'bg-[#FFF3E0] text-[#E65100]',
  FINANCE: 'bg-[#F3E5F5] text-[#6A1B9A]',
  SETTINGS: 'bg-[#E5E7EB] text-[#6B7280]',
  CLAIM: 'bg-[#FFEBEE] text-[#C62828]',
}

const columns = [
  columnHelper.accessor('createdAt', {
    header: 'Horodatage',
    cell: (info) => (
      <time dateTime={info.getValue()} className="text-xs font-mono text-[#6B7280] whitespace-nowrap">
        {formatDateTime(info.getValue())}
      </time>
    ),
  }),
  columnHelper.accessor('userName', {
    header: 'Utilisateur',
    cell: (info) => (
      <div>
        <p className="font-semibold text-[#1A1A1A] text-sm">{info.getValue()}</p>
        <p className="text-xs text-[#9CA3AF] font-mono">{info.row.original.ip}</p>
      </div>
    ),
  }),
  columnHelper.accessor('category', {
    header: 'Categorie',
    cell: (info) => {
      const cat = info.getValue()
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${categoryColors[cat]}`}
        >
          {cat}
        </span>
      )
    },
  }),
  columnHelper.accessor('action', {
    header: 'Action',
    cell: (info) => (
      <span className="text-xs font-mono text-[#1A1A1A] bg-[#F7F4EF] px-2 py-0.5 rounded">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor('details', {
    header: 'Details',
    cell: (info) => (
      <span className="text-sm text-[#6B7280] max-w-sm block">{info.getValue()}</span>
    ),
  }),
]

const CATEGORIES: MockAuditEntry['category'][] = [
  'AUTH',
  'PARTNER',
  'CONSUMER',
  'FINANCE',
  'SETTINGS',
  'CLAIM',
]

function AuditPage() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const filtered = mockAuditEntries
    .filter((e) => {
      if (categoryFilter !== 'ALL') return e.category === categoryFilter
      return true
    })
    .filter((e) => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        e.userName.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        e.details.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#1A1A1A]">Journal d'audit</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Toutes les actions administratives tracees
        </p>
      </div>

      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#E5E7EB] flex items-center gap-3 flex-wrap">
          <SearchInput
            onChange={(v) => { setSearch(v); setPage(1) }}
            placeholder="Rechercher dans les logs..."
            className="max-w-xs flex-1"
          />

          <div>
            <label htmlFor="category-filter" className="sr-only">
              Filtrer par categorie
            </label>
            <select
              id="category-filter"
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
              className="text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 bg-white text-[#1A1A1A]
                focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
            >
              <option value="ALL">Toutes categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <p className="text-xs text-[#9CA3AF] ml-auto">
            {filtered.length} entree{filtered.length !== 1 ? 's' : ''} trouvee{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="p-4">
          <DataTable
            columns={columns}
            data={paged}
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
            emptyMessage="Aucune entree d'audit trouvee"
          />
        </div>
      </div>
    </div>
  )
}
