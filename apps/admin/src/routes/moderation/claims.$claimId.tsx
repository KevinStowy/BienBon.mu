import { createRoute, useNavigate, notFound } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react'
import { Badge, statusToBadgeVariant } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { mockClaims } from '../../mocks/data'
import { formatCurrency, formatDateTime } from '../../lib/utils'
import { Route as rootRoute } from '../__root'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/moderation/claims/$claimId',
  loader: ({ params }) => {
    const claim = mockClaims.find((c) => c.id === params.claimId)
    if (!claim) throw notFound()
    return claim
  },
  component: ClaimDetailPage,
  notFoundComponent: () => (
    <div className="text-center py-20">
      <p className="text-[#6B7280]">Reclamation introuvable.</p>
    </div>
  ),
})

type DialogAction = 'resolve' | 'reject' | null

const typeLabels: Record<string, string> = {
  MISSING_ITEM: 'Article manquant',
  QUALITY_ISSUE: 'Probleme qualite',
  WRONG_BASKET: 'Mauvais panier',
  NO_SHOW_DISPUTE: 'No-show conteste',
}

const statusLabels: Record<string, string> = {
  OPEN: 'Ouverte',
  IN_REVIEW: 'En examen',
  RESOLVED: 'Resolue',
  REJECTED: 'Rejetee',
}

function ClaimDetailPage() {
  const navigate = useNavigate()
  const claim = Route.useLoaderData()
  const [dialogAction, setDialogAction] = useState<DialogAction>(null)
  const [resolution, setResolution] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleAction = async () => {
    setIsProcessing(true)
    await new Promise((r) => setTimeout(r, 800))
    setIsProcessing(false)
    setDialogAction(null)
  }

  const canAct = claim.status === 'OPEN' || claim.status === 'IN_REVIEW'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-4">
        <button
          onClick={() => { void navigate({ to: '/moderation' }) }}
          aria-label="Retour a la liste des reclamations"
          className="flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#1A1A1A] transition-colors mt-1"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Retour
        </button>

        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-extrabold text-[#1A1A1A]">
              Reclamation #{claim.id.split('-')[1]}
            </h1>
            <Badge variant={statusToBadgeVariant(claim.status)}>
              {statusLabels[claim.status] ?? claim.status}
            </Badge>
            <Badge variant={statusToBadgeVariant(claim.urgency)}>
              Urgence: {claim.urgency}
            </Badge>
          </div>
          <p className="text-sm text-[#6B7280] mt-1">
            {typeLabels[claim.type] ?? claim.type} ·
            <time dateTime={claim.createdAt}> {formatDateTime(claim.createdAt)}</time>
          </p>
        </div>

        {canAct ? (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setDialogAction('resolve')}
            >
              <CheckCircle className="w-4 h-4" aria-hidden="true" />
              Resoudre
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setDialogAction('reject')}
            >
              <XCircle className="w-4 h-4" aria-hidden="true" />
              Rejeter
            </Button>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Consumer info */}
        <Card>
          <CardHeader>
            <CardTitle>Consommateur</CardTitle>
          </CardHeader>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="font-semibold text-[#6B7280]">Nom</dt>
            <dd className="text-[#1A1A1A]">{claim.consumerName}</dd>
            <dt className="font-semibold text-[#6B7280]">ID Reservation</dt>
            <dd className="text-[#1A1A1A] font-mono text-xs">{claim.reservationId}</dd>
          </dl>
        </Card>

        {/* Partner info */}
        <Card>
          <CardHeader>
            <CardTitle>Partenaire concerne</CardTitle>
          </CardHeader>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="font-semibold text-[#6B7280]">Commerce</dt>
            <dd className="text-[#1A1A1A]">{claim.partnerName}</dd>
            {claim.amount !== null ? (
              <>
                <dt className="font-semibold text-[#6B7280]">Montant en litige</dt>
                <dd className="text-[#1A1A1A] font-bold">{formatCurrency(claim.amount)}</dd>
              </>
            ) : null}
          </dl>
        </Card>

        {/* Description */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Description de la reclamation</CardTitle>
          </CardHeader>
          <p className="text-sm text-[#1A1A1A] leading-relaxed">{claim.description}</p>
        </Card>

        {/* Resolution */}
        {claim.resolution ? (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Resolution</CardTitle>
            </CardHeader>
            <p className="text-sm text-[#1A1A1A] leading-relaxed">{claim.resolution}</p>
            <p className="text-xs text-[#9CA3AF] mt-2">
              <time dateTime={claim.updatedAt}>{formatDateTime(claim.updatedAt)}</time>
            </p>
          </Card>
        ) : null}
      </div>

      {/* Resolve Dialog */}
      <ConfirmDialog
        isOpen={dialogAction === 'resolve'}
        title="Resoudre cette reclamation"
        description="Veuillez indiquer la resolution appliquee."
        confirmLabel="Confirmer la resolution"
        variant="primary"
        isLoading={isProcessing}
        onConfirm={() => { void handleAction() }}
        onCancel={() => setDialogAction(null)}
      >
        <div>
          <label htmlFor="resolution-text" className="block text-sm font-semibold text-[#1A1A1A] mb-1.5">
            Resolution
          </label>
          <textarea
            id="resolution-text"
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            rows={3}
            placeholder="Ex: Remboursement de Rs 150 effectue..."
            className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg resize-none
              focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
            aria-label="Description de la resolution"
          />
        </div>
      </ConfirmDialog>

      {/* Reject Dialog */}
      <ConfirmDialog
        isOpen={dialogAction === 'reject'}
        title="Rejeter cette reclamation ?"
        description="La reclamation sera marquee comme rejetee. Le consommateur sera informe."
        confirmLabel="Rejeter la reclamation"
        isLoading={isProcessing}
        onConfirm={() => { void handleAction() }}
        onCancel={() => setDialogAction(null)}
      >
        <div>
          <label htmlFor="reject-reason" className="block text-sm font-semibold text-[#1A1A1A] mb-1.5">
            Motif de rejet
          </label>
          <textarea
            id="reject-reason"
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            rows={2}
            placeholder="Ex: Reclamation non justifiee apres verification..."
            className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg resize-none
              focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
            aria-label="Motif de rejet"
          />
        </div>
      </ConfirmDialog>
    </div>
  )
}
