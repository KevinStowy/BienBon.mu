import { createRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { DataTable } from '../../components/ui/DataTable'
import { Badge, statusToBadgeVariant } from '../../components/ui/Badge'
import { SearchInput } from '../../components/ui/SearchInput'
import { mockConsumers, type MockConsumer } from '../../mocks/data'
import { formatCurrency, formatDate } from '../../lib/utils'
import { Route as rootRoute } from '../__root'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/consumers',
  component: ConsumersPage,
})

const columnHelper = createColumnHelper<MockConsumer>()

const columns = [
  columnHelper.display({
    id: 'name',
    header: 'Nom',
    cell: (info) => (
      <div>
        <p className="font-semibold text-[#1A1A1A]">
          {info.row.original.firstName} {info.row.original.lastName}
        </p>
        <p className="text-xs text-[#9CA3AF]">{info.row.original.email}</p>
      </div>
    ),
  }),
  columnHelper.accessor('phone', {
    header: 'Telephone',
    cell: (info) => <span className="text-[#6B7280]">{info.getValue()}</span>,
  }),
  columnHelper.accessor('registeredAt', {
    header: 'Inscrit le',
    cell: (info) => (
      <time dateTime={info.getValue()} className="text-[#6B7280]">
        {formatDate(info.getValue())}
      </time>
    ),
  }),
  columnHelper.accessor('reservationsCount', {
    header: 'Reservations',
    cell: (info) => (
      <span className="font-semibold text-[#1A1A1A]">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('noShowCount', {
    header: 'No-shows',
    cell: (info) => {
      const count = info.getValue()
      return (
        <span
          className={
            count >= 3 ? 'font-bold text-[#C62828]' : 'text-[#6B7280]'
          }
        >
          {count}
        </span>
      )
    },
  }),
  columnHelper.accessor('totalSpent', {
    header: 'Total depense',
    cell: (info) => (
      <span className="font-semibold text-[#2E7D32]">{formatCurrency(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor('status', {
    header: 'Statut',
    cell: (info) => {
      const statusLabels: Record<string, string> = {
        ACTIVE: 'Actif',
        SUSPENDED: 'Suspendu',
        BANNED: 'Banni',
      }
      return (
        <Badge variant={statusToBadgeVariant(info.getValue())}>
          {statusLabels[info.getValue()] ?? info.getValue()}
        </Badge>
      )
    },
  }),
]

function ConsumersPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const filtered = mockConsumers
    .filter((c) => {
      if (statusFilter !== 'ALL') return c.status === statusFilter
      return true
    })
    .filter((c) => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q)
      )
    })

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleRowClick = (consumer: MockConsumer) => {
    void navigate({
      to: '/consumers/$consumerId',
      params: { consumerId: consumer.id },
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#1A1A1A]">Consommateurs</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          {mockConsumers.length} consommateurs inscrits
        </p>
      </div>

      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#E5E7EB] flex items-center gap-3 flex-wrap">
          <SearchInput
            onChange={(v) => { setSearch(v); setPage(1) }}
            placeholder="Rechercher un consommateur..."
            className="max-w-xs flex-1"
          />

          <div>
            <label htmlFor="status-filter" className="sr-only">
              Filtrer par statut
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 bg-white text-[#1A1A1A]
                focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="ACTIVE">Actifs</option>
              <option value="SUSPENDED">Suspendus</option>
              <option value="BANNED">Bannis</option>
            </select>
          </div>
        </div>

        <div className="p-4">
          <DataTable
            columns={columns}
            data={paged}
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
            onRowClick={handleRowClick}
            emptyMessage="Aucun consommateur trouve"
          />
        </div>
      </div>
    </div>
  )
}
