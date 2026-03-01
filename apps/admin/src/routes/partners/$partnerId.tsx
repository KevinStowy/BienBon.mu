import { createRoute, useNavigate, notFound } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, Check, X, Ban, AlertTriangle, Star } from 'lucide-react'
import { Badge, statusToBadgeVariant } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { TabNav } from '../../components/ui/TabNav'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { mockPartners } from '../../mocks/data'
import { formatCurrency, formatDate } from '../../lib/utils'
import { Route as rootRoute } from '../__root'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/partners/$partnerId',
  loader: ({ params }) => {
    const partner = mockPartners.find((p) => p.id === params.partnerId)
    if (!partner) throw notFound()
    return partner
  },
  component: PartnerDetailPage,
  notFoundComponent: () => (
    <div className="text-center py-20">
      <p className="text-[#6B7280]">Partenaire introuvable.</p>
    </div>
  ),
})

const detailTabs = [
  { id: 'info', label: 'Informations' },
  { id: 'stats', label: 'Statistiques' },
  { id: 'commission', label: 'Commission' },
]

type DialogAction = 'approve' | 'reject' | 'suspend' | 'ban' | null

function PartnerDetailPage() {
  const navigate = useNavigate()
  const partner = Route.useLoaderData()
  const [activeTab, setActiveTab] = useState('info')
  const [dialogAction, setDialogAction] = useState<DialogAction>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const statusLabels: Record<string, string> = {
    PENDING: 'En attente',
    ACTIVE: 'Actif',
    SUSPENDED: 'Suspendu',
    REJECTED: 'Rejete',
  }

  const handleAction = async () => {
    setIsProcessing(true)
    // Simulate API call
    await new Promise((r) => setTimeout(r, 800))
    setIsProcessing(false)
    setDialogAction(null)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => { void navigate({ to: '/partners' }) }}
          aria-label="Retour a la liste des partenaires"
          className="flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#1A1A1A] transition-colors mt-1"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Retour
        </button>

        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-[#1A1A1A]">{partner.storeName}</h1>
            <Badge variant={statusToBadgeVariant(partner.status)}>
              {statusLabels[partner.status] ?? partner.status}
            </Badge>
          </div>
          <p className="text-sm text-[#6B7280] mt-1">{partner.address}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {partner.status === 'PENDING' ? (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setDialogAction('approve')}
              >
                <Check className="w-4 h-4" aria-hidden="true" />
                Approuver
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setDialogAction('reject')}
              >
                <X className="w-4 h-4" aria-hidden="true" />
                Rejeter
              </Button>
            </>
          ) : null}
          {partner.status === 'ACTIVE' ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDialogAction('suspend')}
            >
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
              Suspendre
            </Button>
          ) : null}
          {partner.status !== 'REJECTED' && partner.status !== 'BANNED' ? (
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

      {/* Tabs */}
      <TabNav tabs={detailTabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      <div role="tabpanel" id={`tabpanel-${activeTab}`} aria-label={activeTab}>
        {activeTab === 'info' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Informations du commerce</CardTitle>
              </CardHeader>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <dt className="font-semibold text-[#6B7280]">Type</dt>
                <dd className="text-[#1A1A1A]">{partner.type}</dd>
                <dt className="font-semibold text-[#6B7280]">Adresse</dt>
                <dd className="text-[#1A1A1A]">{partner.address}</dd>
                <dt className="font-semibold text-[#6B7280]">Soumis le</dt>
                <dd className="text-[#1A1A1A]">
                  <time dateTime={partner.submittedAt}>{formatDate(partner.submittedAt)}</time>
                </dd>
                {partner.approvedAt ? (
                  <>
                    <dt className="font-semibold text-[#6B7280]">Approuve le</dt>
                    <dd className="text-[#1A1A1A]">
                      <time dateTime={partner.approvedAt}>{formatDate(partner.approvedAt)}</time>
                    </dd>
                  </>
                ) : null}
              </dl>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Responsable</CardTitle>
              </CardHeader>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <dt className="font-semibold text-[#6B7280]">Nom</dt>
                <dd className="text-[#1A1A1A]">{partner.managerName}</dd>
                <dt className="font-semibold text-[#6B7280]">Email</dt>
                <dd className="text-[#1A1A1A] break-all">{partner.managerEmail}</dd>
                <dt className="font-semibold text-[#6B7280]">Telephone</dt>
                <dd className="text-[#1A1A1A]">{partner.phone}</dd>
              </dl>
            </Card>
          </div>
        ) : null}

        {activeTab === 'stats' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Paniers vendus</p>
              <p className="text-3xl font-extrabold text-[#1A1A1A]">{partner.basketsTotal}</p>
            </Card>
            <Card>
              <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Revenus totaux</p>
              <p className="text-3xl font-extrabold text-[#1A1A1A]">{formatCurrency(partner.revenueTotal)}</p>
            </Card>
            <Card>
              <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Note moyenne</p>
              <div className="flex items-center gap-2">
                <p className="text-3xl font-extrabold text-[#1A1A1A]">
                  {partner.rating > 0 ? partner.rating.toFixed(1) : '-'}
                </p>
                {partner.rating > 0 ? (
                  <Star className="w-6 h-6 text-[#FF9800] fill-[#FF9800]" aria-hidden="true" />
                ) : null}
              </div>
              {partner.reviewCount > 0 ? (
                <p className="text-xs text-[#9CA3AF] mt-1">{partner.reviewCount} avis</p>
              ) : null}
            </Card>
          </div>
        ) : null}

        {activeTab === 'commission' ? (
          <Card>
            <CardHeader>
              <CardTitle>Parametres de commission</CardTitle>
            </CardHeader>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm max-w-sm">
              <dt className="font-semibold text-[#6B7280]">Taux de commission</dt>
              <dd className="text-[#1A1A1A] font-bold">{partner.commissionRate}%</dd>
              <dt className="font-semibold text-[#6B7280]">Commission generee</dt>
              <dd className="text-[#1A1A1A]">
                {formatCurrency(partner.revenueTotal * partner.commissionRate / 100)}
              </dd>
            </dl>
          </Card>
        ) : null}
      </div>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        isOpen={dialogAction === 'approve'}
        title="Approuver ce partenaire ?"
        description={`Vous etes sur le point d'approuver "${partner.storeName}". Il pourra immediatement creer des paniers.`}
        confirmLabel="Approuver"
        variant="primary"
        isLoading={isProcessing}
        onConfirm={() => { void handleAction() }}
        onCancel={() => setDialogAction(null)}
      />

      <ConfirmDialog
        isOpen={dialogAction === 'reject'}
        title="Rejeter ce partenaire ?"
        description={`Vous etes sur le point de rejeter "${partner.storeName}". Il ne pourra pas rejoindre la plateforme.`}
        confirmLabel="Rejeter"
        isLoading={isProcessing}
        onConfirm={() => { void handleAction() }}
        onCancel={() => setDialogAction(null)}
      />

      <ConfirmDialog
        isOpen={dialogAction === 'suspend'}
        title="Suspendre ce partenaire ?"
        description={`Vous etes sur le point de suspendre "${partner.storeName}". Sa boutique sera masquee temporairement.`}
        confirmLabel="Suspendre"
        isLoading={isProcessing}
        onConfirm={() => { void handleAction() }}
        onCancel={() => setDialogAction(null)}
      />

      <ConfirmDialog
        isOpen={dialogAction === 'ban'}
        title="Bannir ce partenaire ?"
        description={`Vous etes sur le point de bannir definitivement "${partner.storeName}". Cette action est irreversible.`}
        confirmLabel="Bannir definitvement"
        isLoading={isProcessing}
        onConfirm={() => { void handleAction() }}
        onCancel={() => setDialogAction(null)}
      />
    </div>
  )
}
