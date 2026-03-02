import { createRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { DataTable } from '../../components/ui/DataTable'
import { Badge, statusToBadgeVariant } from '../../components/ui/Badge'
import { TabNav } from '../../components/ui/TabNav'
import { Trash2 } from 'lucide-react'
import { useClaims, useReviews, useDeleteReview } from '../../hooks/use-claims'
import type { Claim, Review } from '../../api/types'
import { formatDate, cn } from '../../lib/utils'
import { Route as rootRoute } from '../__root'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/moderation',
  component: ModerationPage,
})

const claimColumnHelper = createColumnHelper<Claim>()
const reviewColumnHelper = createColumnHelper<Review>()

const claimColumns = [
  claimColumnHelper.accessor('id', {
    header: 'ID',
    cell: (info) => (
      <span className="text-xs font-mono text-[#9CA3AF]">{info.getValue().slice(0, 8)}</span>
    ),
  }),
  claimColumnHelper.accessor('consumerName', {
    header: 'Consommateur',
    cell: (info) => <span className="font-semibold text-[#1A1A1A]">{info.getValue()}</span>,
  }),
  claimColumnHelper.accessor('partnerName', {
    header: 'Partenaire',
    cell: (info) => <span className="text-[#6B7280]">{info.getValue()}</span>,
  }),
  claimColumnHelper.accessor('type', {
    header: 'Type',
    cell: (info) => {
      const labels: Record<string, string> = {
        MISSING_ITEM: 'Article manquant',
        QUALITY_ISSUE: 'Probleme qualite',
        WRONG_BASKET: 'Mauvais panier',
        NO_SHOW_DISPUTE: 'No-show conteste',
      }
      return <span className="text-sm text-[#6B7280]">{labels[info.getValue()] ?? info.getValue()}</span>
    },
  }),
  claimColumnHelper.display({
    id: 'urgency',
    header: 'Urgence',
    cell: (info) => {
      const ageHours = info.row.original.ageHours ?? 0
      const level = ageHours >= 48 ? 'HIGH' : ageHours >= 24 ? 'MEDIUM' : 'LOW'
      const labels: Record<string, string> = { LOW: 'Faible', MEDIUM: 'Moyen', HIGH: 'Eleve' }
      return (
        <Badge variant={statusToBadgeVariant(level)}>
          {labels[level]}
        </Badge>
      )
    },
  }),
  claimColumnHelper.accessor('status', {
    header: 'Statut',
    cell: (info) => {
      const labels: Record<string, string> = {
        OPEN: 'Ouverte',
        IN_PROGRESS: 'En examen',
        IN_REVIEW: 'En examen',
        RESOLVED: 'Resolue',
        REJECTED: 'Rejetee',
      }
      return (
        <Badge variant={statusToBadgeVariant(info.getValue())}>
          {labels[info.getValue()] ?? info.getValue()}
        </Badge>
      )
    },
  }),
  claimColumnHelper.accessor('createdAt', {
    header: 'Date',
    cell: (info) => (
      <time dateTime={info.getValue()} className="text-[#6B7280]">
        {formatDate(info.getValue())}
      </time>
    ),
  }),
]

const reviewColumns = [
  reviewColumnHelper.accessor('consumerName', {
    header: 'Consommateur',
    cell: (info) => <span className="font-semibold text-[#1A1A1A]">{info.getValue()}</span>,
  }),
  reviewColumnHelper.accessor('partnerName', {
    header: 'Partenaire',
    cell: (info) => <span className="text-[#6B7280]">{info.getValue()}</span>,
  }),
  reviewColumnHelper.accessor('rating', {
    header: 'Note',
    cell: (info) => (
      <span
        className={cn(
          'font-bold',
          info.getValue() <= 2 ? 'text-[#C62828]' : 'text-[#2E7D32]',
        )}
      >
        {info.getValue()} / 5
      </span>
    ),
  }),
  reviewColumnHelper.accessor('flagged', {
    header: 'Signal',
    cell: (info) =>
      info.getValue() ? (
        <Badge variant="high">Signale</Badge>
      ) : (
        <Badge variant="active">OK</Badge>
      ),
  }),
  reviewColumnHelper.accessor('createdAt', {
    header: 'Date',
    cell: (info) => (
      <time dateTime={info.getValue()} className="text-[#6B7280]">
        {formatDate(info.getValue())}
      </time>
    ),
  }),
  reviewColumnHelper.display({
    id: 'actions',
    header: 'Actions',
    cell: (info) => {
      return (
        <DeleteReviewButton reviewId={info.row.original.id} consumerName={info.row.original.consumerName} />
      )
    },
  }),
]

function DeleteReviewButton({ reviewId, consumerName }: { reviewId: string; consumerName: string }) {
  const deleteReview = useDeleteReview()

  return (
    <button
      aria-label={`Supprimer l'avis de ${consumerName}`}
      onClick={(e) => {
        e.stopPropagation()
        deleteReview.mutate({ id: reviewId, reason: 'Admin moderation' })
      }}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-[#C62828] hover:bg-[#FFEBEE] rounded transition-colors"
    >
      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
      Supprimer
    </button>
  )
}

function ModerationPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('claims')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const claimsQuery = useClaims()
  const reviewsQuery = useReviews()

  const claims = claimsQuery.data?.data ?? []
  const reviews = reviewsQuery.data?.data ?? []

  const openClaimsCount = claims.filter((c) => c.status === 'OPEN').length

  const tabs = [
    {
      id: 'claims',
      label: 'Reclamations',
      badge: openClaimsCount > 0 ? openClaimsCount : undefined,
    },
    { id: 'reviews', label: 'Avis' },
  ]

  const handleClaimClick = (claim: Claim) => {
    void navigate({
      to: '/moderation/claims/$claimId',
      params: { claimId: claim.id },
    })
  }

  const claimsPageCount = Math.max(1, Math.ceil(claims.length / PAGE_SIZE))
  const pagedClaims = claims.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const reviewsPageCount = Math.max(1, Math.ceil(reviews.length / PAGE_SIZE))
  const pagedReviews = reviews.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#1A1A1A]">Moderation</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Gestion des reclamations et des avis
        </p>
      </div>

      {/* Urgency legend */}
      {activeTab === 'claims' ? (
        <div className="flex items-center gap-4 text-xs text-[#6B7280]">
          <span className="font-semibold">Urgence :</span>
          {(['LOW', 'MEDIUM', 'HIGH'] as const).map((level) => {
            const urgencyClasses: Record<string, string> = {
              LOW: 'bg-[#E8F5E9] border-l-4 border-l-[#4CAF50]',
              MEDIUM: 'bg-[#FFF3E0] border-l-4 border-l-[#FF9800]',
              HIGH: 'bg-[#FFEBEE] border-l-4 border-l-[#C62828]',
            }
            return (
              <span
                key={level}
                className={cn('px-2 py-0.5 rounded text-[#1A1A1A]', urgencyClasses[level])}
              >
                {level === 'LOW' ? 'Faible' : level === 'MEDIUM' ? 'Moyen' : 'Eleve'}
              </span>
            )
          })}
        </div>
      ) : null}

      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#E5E7EB]">
          <TabNav
            tabs={tabs}
            activeTab={activeTab}
            onChange={(t) => { setActiveTab(t); setPage(1) }}
          />
        </div>

        <div className="p-4">
          {activeTab === 'claims' ? (
            <DataTable
              columns={claimColumns}
              data={pagedClaims}
              page={page}
              pageCount={claimsPageCount}
              onPageChange={setPage}
              onRowClick={handleClaimClick}
              isLoading={claimsQuery.isLoading}
              emptyMessage="Aucune reclamation"
            />
          ) : (
            <DataTable
              columns={reviewColumns}
              data={pagedReviews}
              page={page}
              pageCount={reviewsPageCount}
              onPageChange={setPage}
              isLoading={reviewsQuery.isLoading}
              emptyMessage="Aucun avis"
            />
          )}
        </div>
      </div>
    </div>
  )
}
