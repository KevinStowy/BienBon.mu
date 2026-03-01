import { createRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { ShieldAlert, ShieldCheck, Eye } from 'lucide-react'
import { DataTable } from '../components/ui/DataTable'
import { Badge, statusToBadgeVariant } from '../components/ui/Badge'
import { TabNav } from '../components/ui/TabNav'
import { Card } from '../components/ui/Card'
import { mockFraudAlerts, type MockFraudAlert } from '../mocks/data'
import { formatDateTime } from '../lib/utils'
import { Route as rootRoute } from './__root'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/fraud',
  component: FraudPage,
})

const tabs = [
  {
    id: 'alerts',
    label: 'Alertes',
    badge: mockFraudAlerts.filter((f) => f.status === 'ACTIVE' || f.status === 'INVESTIGATING').length,
  },
  { id: 'rules', label: 'Regles' },
  { id: 'suspensions', label: 'Suspensions actives' },
]

const columnHelper = createColumnHelper<MockFraudAlert>()

const typeLabels: Record<MockFraudAlert['type'], string> = {
  VELOCITY_ABUSE: 'Abus de velocite',
  PAYMENT_ANOMALY: 'Anomalie paiement',
  ACCOUNT_TAKEOVER: 'Prise de controle',
  BASKET_FRAUD: 'Fraude panier',
}

const statusLabels: Record<string, string> = {
  ACTIVE: 'Active',
  INVESTIGATING: 'En cours',
  RESOLVED: 'Resolue',
  DISMISSED: 'Ignoree',
}

const columns = [
  columnHelper.accessor('severity', {
    header: 'Severite',
    cell: (info) => (
      <Badge variant={statusToBadgeVariant(info.getValue())}>
        {info.getValue()}
      </Badge>
    ),
  }),
  columnHelper.accessor('type', {
    header: 'Type',
    cell: (info) => (
      <span className="text-sm font-semibold text-[#1A1A1A]">
        {typeLabels[info.getValue()] ?? info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor('entityType', {
    header: 'Entite',
    cell: (info) => (
      <div>
        <p className="text-xs text-[#9CA3AF] uppercase font-semibold">{info.getValue()}</p>
        <p className="text-sm text-[#1A1A1A]">{info.row.original.entityName}</p>
      </div>
    ),
  }),
  columnHelper.accessor('description', {
    header: 'Description',
    cell: (info) => (
      <span className="text-sm text-[#6B7280] max-w-xs block">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('status', {
    header: 'Statut',
    cell: (info) => (
      <Badge variant={statusToBadgeVariant(info.getValue())}>
        {statusLabels[info.getValue()] ?? info.getValue()}
      </Badge>
    ),
  }),
  columnHelper.accessor('createdAt', {
    header: 'Detecte le',
    cell: (info) => (
      <time dateTime={info.getValue()} className="text-xs text-[#6B7280] whitespace-nowrap">
        {formatDateTime(info.getValue())}
      </time>
    ),
  }),
  columnHelper.display({
    id: 'actions',
    header: 'Actions',
    cell: (info) => (
      <button
        aria-label={`Voir details de l'alerte ${info.row.original.id}`}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-[#2E7D32] hover:bg-[#E8F5E9] rounded transition-colors"
      >
        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
        Voir
      </button>
    ),
  }),
]

// Mock fraud rules
const mockRules = [
  {
    id: 'rule-001',
    name: 'Seuil de no-show',
    description: 'Suspendre automatiquement un consommateur apres 5 no-shows en 30 jours',
    threshold: 5,
    window: '30 jours',
    action: 'SUSPEND',
    enabled: true,
  },
  {
    id: 'rule-002',
    name: 'Abus de velocite reservation',
    description: 'Alerter si plus de 10 reservations en 1 heure pour le meme consommateur',
    threshold: 10,
    window: '1 heure',
    action: 'ALERT',
    enabled: true,
  },
  {
    id: 'rule-003',
    name: 'Multi-localisation',
    description: 'Alerter si connexions depuis plus de 2 pays en 24h',
    threshold: 2,
    window: '24 heures',
    action: 'ALERT',
    enabled: true,
  },
  {
    id: 'rule-004',
    name: 'Tentatives paiement refusees',
    description: 'Alerter si 3 paiements refuses consecutifs',
    threshold: 3,
    window: 'Consecutif',
    action: 'ALERT',
    enabled: false,
  },
]

// Active suspensions from fraud
const activeSuspensions = mockFraudAlerts.filter(
  (f) => (f.status === 'RESOLVED' || f.status === 'ACTIVE') && f.entityType === 'CONSUMER',
)

function AlertsTab() {
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10
  const pageCount = Math.max(1, Math.ceil(mockFraudAlerts.length / PAGE_SIZE))
  const paged = mockFraudAlerts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <DataTable
      columns={columns}
      data={paged}
      page={page}
      pageCount={pageCount}
      onPageChange={setPage}
      emptyMessage="Aucune alerte fraude"
    />
  )
}

function RulesTab() {
  return (
    <div className="flex flex-col gap-4">
      {mockRules.map((rule) => (
        <Card key={rule.id}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {rule.enabled ? (
                  <ShieldAlert className="w-5 h-5 text-[#C62828]" aria-hidden="true" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-[#9CA3AF]" aria-hidden="true" />
                )}
              </div>
              <div>
                <p className="font-bold text-[#1A1A1A]">{rule.name}</p>
                <p className="text-sm text-[#6B7280] mt-0.5">{rule.description}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-[#9CA3AF]">
                  <span>Seuil: <strong className="text-[#1A1A1A]">{rule.threshold}</strong></span>
                  <span>Fenetre: <strong className="text-[#1A1A1A]">{rule.window}</strong></span>
                  <span>Action: <strong className="text-[#1A1A1A]">{rule.action}</strong></span>
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 flex-shrink-0 cursor-pointer" aria-label={`${rule.enabled ? 'Desactiver' : 'Activer'} la regle ${rule.name}`}>
              <span className="text-xs font-semibold text-[#6B7280]">
                {rule.enabled ? 'Active' : 'Inactive'}
              </span>
              <div
                className={`relative w-10 h-6 rounded-full transition-colors duration-200 ${rule.enabled ? 'bg-[#2E7D32]' : 'bg-[#E5E7EB]'}`}
                role="switch"
                aria-checked={rule.enabled}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${rule.enabled ? 'translate-x-5' : 'translate-x-1'}`}
                />
              </div>
            </label>
          </div>
        </Card>
      ))}
    </div>
  )
}

function SuspensionsTab() {
  return (
    <div className="flex flex-col gap-4">
      {activeSuspensions.length === 0 ? (
        <Card>
          <p className="text-center text-[#9CA3AF] py-8">Aucune suspension active.</p>
        </Card>
      ) : (
        activeSuspensions.map((suspension) => (
          <Card key={suspension.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-[#1A1A1A]">{suspension.entityName}</p>
                  <Badge variant="suspended">{suspension.entityType}</Badge>
                </div>
                <p className="text-sm text-[#6B7280] mt-1">{suspension.description}</p>
                <p className="text-xs text-[#9CA3AF] mt-1">
                  Detecte le{' '}
                  <time dateTime={suspension.createdAt}>{formatDateTime(suspension.createdAt)}</time>
                </p>
              </div>
              <Badge variant={statusToBadgeVariant(suspension.status)}>
                {statusLabels[suspension.status] ?? suspension.status}
              </Badge>
            </div>
          </Card>
        ))
      )}
    </div>
  )
}

function FraudPage() {
  const [activeTab, setActiveTab] = useState('alerts')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#1A1A1A]">Fraude & Abus</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Detection et gestion des comportements suspects
        </p>
      </div>

      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4">
        <TabNav tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <div role="tabpanel" id={`tabpanel-${activeTab}`}>
        {activeTab === 'alerts' ? <AlertsTab /> : null}
        {activeTab === 'rules' ? <RulesTab /> : null}
        {activeTab === 'suspensions' ? <SuspensionsTab /> : null}
      </div>
    </div>
  )
}
