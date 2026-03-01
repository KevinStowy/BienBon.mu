import { createRoute, useNavigate } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { Eye, Plus, Check, X } from 'lucide-react'
import { DataTable } from '../../components/ui/DataTable'
import { Badge, statusToBadgeVariant } from '../../components/ui/Badge'
import { TabNav } from '../../components/ui/TabNav'
import { SearchInput } from '../../components/ui/SearchInput'
import { Button } from '../../components/ui/Button'
import { TextareaDialog } from '../../components/ui/TextareaDialog'
import { ExportCsvButton } from '../../components/ui/ExportCsvButton'
import { usePartners, usePartnerModifications, useApprovePartner, useRejectPartner } from '../../hooks/use-partners'
import type { Partner, PartnerModification } from '../../api/types'
import { formatDate, formatCurrency } from '../../lib/utils'
import { Route as rootRoute } from '../__root'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/partners',
  component: PartnersPage,
})

// --- Partner columns ---
const columnHelper = createColumnHelper<Partner>()

const partnerColumns = [
  columnHelper.accessor('storeName', {
    header: 'Commerce',
    cell: (info) => (
      <div>
        <span className="font-semibold text-neutral-900">{info.getValue()}</span>
        <span className="block text-xs text-neutral-400">{info.row.original.channel}</span>
      </div>
    ),
  }),
  columnHelper.accessor('type', {
    header: 'Type',
    cell: (info) => {
      const labels: Record<string, string> = {
        RESTAURANT: 'Restaurant',
        BAKERY: 'Boulangerie',
        GROCERY: 'Epicerie',
        CAFE: 'Cafe',
        PATISSERIE: 'Patisserie',
        TRAITEUR: 'Traiteur',
      }
      return <span className="text-neutral-600">{labels[info.getValue()] ?? info.getValue()}</span>
    },
  }),
  columnHelper.display({
    id: 'manager',
    header: 'Responsable',
    cell: (info) => (
      <div>
        <p className="text-neutral-900">{info.row.original.managerFirstName} {info.row.original.managerLastName}</p>
        <p className="text-xs text-neutral-400">{info.row.original.managerEmail}</p>
      </div>
    ),
  }),
  columnHelper.accessor('submittedAt', {
    header: 'Soumis le',
    cell: (info) => (
      <time dateTime={info.getValue()} className="text-neutral-600">
        {formatDate(info.getValue())}
      </time>
    ),
  }),
  columnHelper.accessor('revenueTotal', {
    header: 'CA Total',
    cell: (info) => (
      <span className="font-semibold text-neutral-900">
        {info.getValue() > 0 ? formatCurrency(info.getValue()) : '-'}
      </span>
    ),
  }),
  columnHelper.accessor('status', {
    header: 'Statut',
    cell: (info) => {
      const statusLabels: Record<string, string> = {
        PENDING: 'En attente',
        ACTIVE: 'Actif',
        SUSPENDED: 'Suspendu',
        REJECTED: 'Rejete',
        BANNED: 'Banni',
      }
      return (
        <Badge variant={statusToBadgeVariant(info.getValue())}>
          {statusLabels[info.getValue()] ?? info.getValue()}
        </Badge>
      )
    },
  }),
  columnHelper.display({
    id: 'actions',
    header: 'Actions',
    cell: (info) => (
      <button
        onClick={(e) => {
          e.stopPropagation()
        }}
        aria-label={`Voir les details de ${info.row.original.storeName}`}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-100 rounded transition-colors"
      >
        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
        Voir
      </button>
    ),
  }),
]

// --- Modification columns ---
const modColumnHelper = createColumnHelper<PartnerModification>()

const modificationColumns = [
  modColumnHelper.accessor('partnerName', {
    header: 'Partenaire',
    cell: (info) => <span className="font-semibold text-neutral-900">{info.getValue()}</span>,
  }),
  modColumnHelper.display({
    id: 'fieldsCount',
    header: 'Champs modifies',
    cell: (info) => (
      <span className="text-neutral-600">{info.row.original.fields.length} champ(s)</span>
    ),
  }),
  modColumnHelper.accessor('submittedAt', {
    header: 'Soumis le',
    cell: (info) => (
      <time dateTime={info.getValue()} className="text-neutral-600">
        {formatDate(info.getValue())}
      </time>
    ),
  }),
  modColumnHelper.accessor('status', {
    header: 'Statut',
    cell: (info) => {
      const labels: Record<string, string> = {
        PENDING: 'En attente',
        APPROVED: 'Approuve',
        REJECTED: 'Rejete',
        PARTIAL: 'Partiel',
      }
      return (
        <Badge variant={statusToBadgeVariant(info.getValue())}>
          {labels[info.getValue()] ?? info.getValue()}
        </Badge>
      )
    },
  }),
]

// --- Tab definitions ---
type TabId = 'pending' | 'modifications' | 'active' | 'suspended' | 'all'

const REJECT_MOTIFS = [
  'BRN invalide ou non verifiable',
  'Documents manquants',
  'Adresse non conforme',
  'Activite non eligible',
  'Informations incoherentes',
]

function PartnersPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabId>('pending')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  // Queries
  const statusFilter = activeTab === 'all' ? undefined
    : activeTab === 'modifications' ? undefined
      : activeTab === 'pending' ? 'PENDING'
        : activeTab === 'active' ? 'ACTIVE'
          : 'SUSPENDED'

  const partnersQuery = usePartners({ status: statusFilter, search })
  const modificationsQuery = usePartnerModifications()
  const approveMutation = useApprovePartner()
  const rejectMutation = useRejectPartner()

  const partners = partnersQuery.data?.data ?? []
  const modifications = (modificationsQuery.data ?? []).filter((m) => m.status === 'PENDING')

  // Inline approve/reject dialogs
  const [approvePartnerId, setApprovePartnerId] = useState<string | null>(null)
  const [rejectPartnerId, setRejectPartnerId] = useState<string | null>(null)
  const approvePartner = partners.find((p) => p.id === approvePartnerId)
  const rejectPartner = partners.find((p) => p.id === rejectPartnerId)

  // Tab badges
  const pendingCount = partners.filter((p) => p.status === 'PENDING').length
  const tabs = [
    { id: 'pending' as const, label: 'En attente', badge: activeTab === 'pending' ? undefined : pendingCount },
    { id: 'modifications' as const, label: 'Modifications', badge: modifications.length > 0 ? modifications.length : undefined },
    { id: 'active' as const, label: 'Actifs' },
    { id: 'suspended' as const, label: 'Suspendus' },
    { id: 'all' as const, label: 'Tous' },
  ]

  const handleTabChange = useCallback((t: string) => {
    setActiveTab(t as TabId)
    setPage(1)
  }, [])

  const handleSearchChange = useCallback((v: string) => {
    setSearch(v)
    setPage(1)
  }, [])

  const handleRowClick = (partner: Partner) => {
    void navigate({ to: '/partners/$partnerId', params: { partnerId: partner.id } })
  }

  const handleApprove = (partnerId: string) => {
    approveMutation.mutate({ id: partnerId })
    setApprovePartnerId(null)
  }

  const handleReject = (partnerId: string, reason: string) => {
    rejectMutation.mutate({ id: partnerId, reason })
    setRejectPartnerId(null)
  }

  // Pagination
  const filteredPartners = partners
  const pageCount = Math.max(1, Math.ceil(filteredPartners.length / PAGE_SIZE))
  const pagedPartners = filteredPartners.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const modPageCount = Math.max(1, Math.ceil(modifications.length / PAGE_SIZE))
  const pagedModifications = modifications.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // CSV export data
  const csvColumns = [
    { key: 'storeName' as const, label: 'Commerce' },
    { key: 'type' as const, label: 'Type' },
    { key: 'status' as const, label: 'Statut' },
    { key: 'managerEmail' as const, label: 'Email' },
    { key: 'managerPhone' as const, label: 'Telephone' },
    { key: 'address' as const, label: 'Adresse' },
    { key: 'revenueTotal' as const, label: 'CA Total' },
  ]

  // Pending partners get inline approve/reject buttons
  const pendingColumns = [
    ...partnerColumns.slice(0, -1),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: (info) => {
        const p = info.row.original
        if (p.status !== 'PENDING') {
          return (
            <button
              onClick={(e) => { e.stopPropagation() }}
              aria-label={`Voir les details de ${p.storeName}`}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-100 rounded transition-colors"
            >
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
              Voir
            </button>
          )
        }
        return (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setApprovePartnerId(p.id)}
              aria-label={`Approuver ${p.storeName}`}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-100 rounded transition-colors"
            >
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
              Approuver
            </button>
            <button
              onClick={() => setRejectPartnerId(p.id)}
              aria-label={`Rejeter ${p.storeName}`}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
              Rejeter
            </button>
          </div>
        )
      },
    }),
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900">Partenaires</h1>
          <p className="text-sm text-neutral-600 mt-1">
            {filteredPartners.length} partenaire{filteredPartners.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportCsvButton
            data={filteredPartners}
            columns={csvColumns}
            filename="partenaires"
            aria-label="Exporter la liste des partenaires en CSV"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              // US-A009: Manual partner creation — navigate to creation form
              // For now, placeholder
            }}
            aria-label="Ajouter un partenaire manuellement"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Ajouter
          </Button>
        </div>
      </div>

      {/* Tabs + Content */}
      <div className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-neutral-200">
          <TabNav tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />
        </div>

        <div className="p-4 border-b border-neutral-200">
          <SearchInput
            onChange={handleSearchChange}
            placeholder="Rechercher un partenaire..."
            className="max-w-xs"
          />
        </div>

        <div className="p-4">
          {activeTab === 'modifications' ? (
            <DataTable
              columns={modificationColumns}
              data={pagedModifications}
              page={page}
              pageCount={modPageCount}
              onPageChange={setPage}
              isLoading={modificationsQuery.isLoading}
              emptyMessage="Aucune modification en attente"
            />
          ) : (
            <DataTable
              columns={activeTab === 'pending' ? pendingColumns : partnerColumns}
              data={pagedPartners}
              page={page}
              pageCount={pageCount}
              onPageChange={setPage}
              onRowClick={handleRowClick}
              isLoading={partnersQuery.isLoading}
              emptyMessage={
                activeTab === 'pending'
                  ? "Aucun partenaire en attente d'approbation"
                  : 'Aucun partenaire trouve'
              }
            />
          )}
        </div>
      </div>

      {/* Approve Dialog */}
      {approvePartner ? (
        <TextareaDialog
          isOpen={true}
          title={`Approuver ${approvePartner.storeName} ?`}
          description={`Le partenaire pourra immediatement creer des paniers. BRN: ${approvePartner.brn}`}
          confirmLabel="Approuver"
          variant="primary"
          isLoading={approveMutation.isPending}
          required={false}
          placeholder="Commentaire optionnel..."
          onConfirm={() => handleApprove(approvePartner.id)}
          onCancel={() => setApprovePartnerId(null)}
        />
      ) : null}

      {/* Reject Dialog with mandatory motif */}
      {rejectPartner ? (
        <TextareaDialog
          isOpen={true}
          title={`Rejeter ${rejectPartner.storeName} ?`}
          description="Le partenaire ne pourra pas rejoindre la plateforme. Veuillez indiquer un motif obligatoire."
          confirmLabel="Rejeter"
          variant="danger"
          isLoading={rejectMutation.isPending}
          required={true}
          minLength={10}
          placeholder="Motif du rejet..."
          presetOptions={REJECT_MOTIFS}
          onConfirm={(reason) => handleReject(rejectPartner.id, reason)}
          onCancel={() => setRejectPartnerId(null)}
        />
      ) : null}
    </div>
  )
}
