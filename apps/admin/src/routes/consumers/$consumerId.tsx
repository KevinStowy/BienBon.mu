import { createRoute, useNavigate, notFound } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, AlertTriangle, Ban } from 'lucide-react'
import { Badge, statusToBadgeVariant } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { TabNav } from '../../components/ui/TabNav'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { mockConsumers, mockClaims } from '../../mocks/data'
import { formatCurrency, formatDate } from '../../lib/utils'
import { Route as rootRoute } from '../__root'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/consumers/$consumerId',
  loader: ({ params }) => {
    const consumer = mockConsumers.find((c) => c.id === params.consumerId)
    if (!consumer) throw notFound()
    return consumer
  },
  component: ConsumerDetailPage,
  notFoundComponent: () => (
    <div className="text-center py-20">
      <p className="text-[#6B7280]">Consommateur introuvable.</p>
    </div>
  ),
})

const detailTabs = [
  { id: 'info', label: 'Informations' },
  { id: 'stats', label: 'Statistiques' },
  { id: 'claims', label: 'Reclamations' },
]

type DialogAction = 'suspend' | 'ban' | null

function ConsumerDetailPage() {
  const navigate = useNavigate()
  const consumer = Route.useLoaderData()
  const [activeTab, setActiveTab] = useState('info')
  const [dialogAction, setDialogAction] = useState<DialogAction>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const statusLabels: Record<string, string> = {
    ACTIVE: 'Actif',
    SUSPENDED: 'Suspendu',
    BANNED: 'Banni',
  }

  const consumerClaims = mockClaims.filter((c) => c.consumerId === consumer.id)

  const handleAction = async () => {
    setIsProcessing(true)
    await new Promise((r) => setTimeout(r, 800))
    setIsProcessing(false)
    setDialogAction(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-4">
        <button
          onClick={() => { void navigate({ to: '/consumers' }) }}
          aria-label="Retour a la liste des consommateurs"
          className="flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#1A1A1A] transition-colors mt-1"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Retour
        </button>

        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-[#1A1A1A]">
              {consumer.firstName} {consumer.lastName}
            </h1>
            <Badge variant={statusToBadgeVariant(consumer.status)}>
              {statusLabels[consumer.status] ?? consumer.status}
            </Badge>
          </div>
          <p className="text-sm text-[#6B7280] mt-1">{consumer.email}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {consumer.status === 'ACTIVE' ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDialogAction('suspend')}
            >
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
              Suspendre
            </Button>
          ) : null}
          {consumer.status !== 'BANNED' ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setDialogAction('ban')}
            >
              <Ban className="w-4 h-4" aria-hidden="true" />
              Bannir
            </Button>
          ) : null}
        </div>
      </div>

      <TabNav tabs={detailTabs} activeTab={activeTab} onChange={setActiveTab} />

      <div role="tabpanel" id={`tabpanel-${activeTab}`}>
        {activeTab === 'info' ? (
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
            </CardHeader>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm max-w-md">
              <dt className="font-semibold text-[#6B7280]">Prenom</dt>
              <dd className="text-[#1A1A1A]">{consumer.firstName}</dd>
              <dt className="font-semibold text-[#6B7280]">Nom</dt>
              <dd className="text-[#1A1A1A]">{consumer.lastName}</dd>
              <dt className="font-semibold text-[#6B7280]">Email</dt>
              <dd className="text-[#1A1A1A] break-all">{consumer.email}</dd>
              <dt className="font-semibold text-[#6B7280]">Telephone</dt>
              <dd className="text-[#1A1A1A]">{consumer.phone}</dd>
              <dt className="font-semibold text-[#6B7280]">Inscrit le</dt>
              <dd className="text-[#1A1A1A]">
                <time dateTime={consumer.registeredAt}>{formatDate(consumer.registeredAt)}</time>
              </dd>
            </dl>
          </Card>
        ) : null}

        {activeTab === 'stats' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Reservations</p>
              <p className="text-3xl font-extrabold text-[#1A1A1A]">{consumer.reservationsCount}</p>
            </Card>
            <Card>
              <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">No-shows</p>
              <p className={`text-3xl font-extrabold ${consumer.noShowCount >= 3 ? 'text-[#C62828]' : 'text-[#1A1A1A]'}`}>
                {consumer.noShowCount}
              </p>
              {consumer.noShowCount >= 3 ? (
                <p className="text-xs text-[#C62828] mt-1 font-semibold">Seuil d'alerte atteint</p>
              ) : null}
            </Card>
            <Card>
              <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Total depense</p>
              <p className="text-3xl font-extrabold text-[#2E7D32]">{formatCurrency(consumer.totalSpent)}</p>
            </Card>
          </div>
        ) : null}

        {activeTab === 'claims' ? (
          consumerClaims.length === 0 ? (
            <Card>
              <p className="text-center text-[#9CA3AF] py-8">Aucune reclamation pour ce consommateur.</p>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {consumerClaims.map((claim) => (
                <Card key={claim.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[#1A1A1A]">{claim.description}</p>
                      <p className="text-xs text-[#9CA3AF] mt-1">
                        {claim.partnerName} ·
                        <time dateTime={claim.createdAt}>{formatDate(claim.createdAt)}</time>
                      </p>
                    </div>
                    <Badge variant={statusToBadgeVariant(claim.status)}>
                      {claim.status}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )
        ) : null}
      </div>

      <ConfirmDialog
        isOpen={dialogAction === 'suspend'}
        title="Suspendre ce consommateur ?"
        description={`Vous etes sur le point de suspendre "${consumer.firstName} ${consumer.lastName}". Il ne pourra plus effectuer de reservations.`}
        confirmLabel="Suspendre"
        isLoading={isProcessing}
        onConfirm={() => { void handleAction() }}
        onCancel={() => setDialogAction(null)}
      />

      <ConfirmDialog
        isOpen={dialogAction === 'ban'}
        title="Bannir ce consommateur ?"
        description={`Vous etes sur le point de bannir definitivement "${consumer.firstName} ${consumer.lastName}". Cette action est irreversible.`}
        confirmLabel="Bannir definitvement"
        isLoading={isProcessing}
        onConfirm={() => { void handleAction() }}
        onCancel={() => setDialogAction(null)}
      />
    </div>
  )
}
