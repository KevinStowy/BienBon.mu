import { createRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Save } from 'lucide-react'
import { TabNav } from '../components/ui/TabNav'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { KpiCard } from '../components/ui/KpiCard'
import { Badge, statusToBadgeVariant } from '../components/ui/Badge'
import {
  useRevenue,
  useRevenueByPartner,
  useCommissionConfig,
  useUpdateCommissionConfig,
  usePayouts,
  useMarkPayoutAsPaid,
} from '../hooks/use-finance'
import { formatCurrency, formatDate } from '../lib/utils'
import { Route as rootRoute } from './__root'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/finance',
  component: FinancePage,
})

const tabs = [
  { id: 'revenue', label: 'Revenus' },
  { id: 'commission', label: 'Commissions' },
  { id: 'payouts', label: 'Virements' },
]

function CommissionSettings() {
  const configQuery = useCommissionConfig()
  const updateConfig = useUpdateCommissionConfig()
  const revenueByPartnerQuery = useRevenueByPartner()

  const config = configQuery.data
  const [globalRate, setGlobalRate] = useState<number | null>(null)
  const [feeMinimum, setFeeMinimum] = useState<number | null>(null)

  const displayRate = globalRate ?? (config ? config.globalRate * 100 : 15)
  const displayFee = feeMinimum ?? (config ? config.feeMinimum : 50)

  const partners = revenueByPartnerQuery.data ?? []

  const handleSave = () => {
    updateConfig.mutate({
      globalRate: displayRate / 100,
      feeMinimum: displayFee,
    })
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Taux de commission</CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="global-rate"
              className="block text-sm font-semibold text-[#1A1A1A] mb-1.5"
            >
              Taux standard (%)
            </label>
            <input
              id="global-rate"
              type="number"
              min={0}
              max={50}
              step={0.5}
              value={displayRate}
              onChange={(e) => setGlobalRate(Number(e.target.value))}
              aria-describedby="global-rate-desc"
              className="w-32 px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg
                focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
            />
            <p id="global-rate-desc" className="mt-1 text-xs text-[#9CA3AF]">
              Applique a tous les nouveaux partenaires
            </p>
          </div>

          <div>
            <label
              htmlFor="fee-minimum"
              className="block text-sm font-semibold text-[#1A1A1A] mb-1.5"
            >
              Frais minimum (Rs)
            </label>
            <input
              id="fee-minimum"
              type="number"
              min={0}
              max={500}
              step={5}
              value={displayFee}
              onChange={(e) => setFeeMinimum(Number(e.target.value))}
              aria-describedby="fee-minimum-desc"
              className="w-32 px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg
                focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
            />
            <p id="fee-minimum-desc" className="mt-1 text-xs text-[#9CA3AF]">
              Frais minimum par transaction
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            className="self-start"
            isLoading={updateConfig.isPending}
            onClick={handleSave}
          >
            <Save className="w-4 h-4" aria-hidden="true" />
            Sauvegarder
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Commission par partenaire</CardTitle>
        </CardHeader>
        <table className="w-full text-sm" aria-label="Commissions par partenaire">
          <thead>
            <tr className="border-b border-[#E5E7EB]">
              <th scope="col" className="text-left py-2 font-bold text-[#6B7280] text-xs uppercase">Commerce</th>
              <th scope="col" className="text-right py-2 font-bold text-[#6B7280] text-xs uppercase">Revenu</th>
              <th scope="col" className="text-right py-2 font-bold text-[#6B7280] text-xs uppercase">Commission</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {partners.map((p) => (
              <tr key={p.partnerId}>
                <td className="py-2.5 text-[#1A1A1A] font-semibold">{p.partnerName}</td>
                <td className="py-2.5 text-right text-[#1A1A1A]">{formatCurrency(p.revenue)}</td>
                <td className="py-2.5 text-right font-semibold text-[#2E7D32]">
                  {formatCurrency(p.commission)}
                </td>
              </tr>
            ))}
            {partners.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-[#9CA3AF]">
                  Aucune donnee de commission disponible
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function RevenueTab() {
  const revenueQuery = useRevenue('this_month')
  const overview = revenueQuery.data

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          label="Revenus du mois"
          value={formatCurrency(overview?.totalRevenue ?? 0)}
          trend={0}
        />
        <KpiCard
          label="Commissions percues"
          value={formatCurrency(overview?.totalCommission ?? 0)}
          trend={0}
        />
        <KpiCard
          label="Transactions"
          value={(overview?.totalTransactions ?? 0).toLocaleString()}
          trend={0}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          label="Montant moyen"
          value={formatCurrency(overview?.avgTransactionAmount ?? 0)}
          trend={0}
        />
        <KpiCard
          label="Marge moyenne"
          value={`${((overview?.avgMargin ?? 0) * 100).toFixed(1)}%`}
          trend={0}
        />
        <KpiCard
          label="Remboursements"
          value={formatCurrency(overview?.totalRefunds ?? 0)}
          trend={0}
        />
      </div>
    </div>
  )
}

function PayoutsTab() {
  const payoutsQuery = usePayouts()
  const markPaid = useMarkPayoutAsPaid()
  const payouts = payoutsQuery.data?.data ?? []

  return (
    <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm overflow-hidden">
      <table className="w-full text-sm" aria-label="Virements partenaires">
        <caption className="sr-only">Liste des virements partenaires</caption>
        <thead className="bg-[#F7F4EF]">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase">Partenaire</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase">Periode</th>
            <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-[#6B7280] uppercase">Montant brut</th>
            <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-[#6B7280] uppercase">Commission</th>
            <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-[#6B7280] uppercase">Net</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase">Statut</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E7EB]">
          {payouts.map((payout) => (
            <tr key={payout.id} className="hover:bg-[#F7F4EF] transition-colors">
              <td className="px-4 py-3 font-semibold text-[#1A1A1A]">{payout.partnerName}</td>
              <td className="px-4 py-3 text-[#6B7280]">{payout.period}</td>
              <td className="px-4 py-3 text-right font-semibold text-[#1A1A1A]">
                {formatCurrency(payout.totalGrossSales)}
              </td>
              <td className="px-4 py-3 text-right text-[#C62828]">
                -{formatCurrency(payout.totalCommission)}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-[#2E7D32]">
                {formatCurrency(payout.netPayout)}
              </td>
              <td className="px-4 py-3">
                <Badge variant={statusToBadgeVariant(payout.status)}>
                  {payout.status === 'PAID' ? 'Paye' : payout.status === 'ERROR' ? 'Erreur' : 'En attente'}
                </Badge>
              </td>
              <td className="px-4 py-3">
                {payout.status === 'PENDING' && (
                  <Button
                    variant="primary"
                    size="sm"
                    isLoading={markPaid.isPending}
                    onClick={() => markPaid.mutate({ id: payout.id })}
                  >
                    Marquer paye
                  </Button>
                )}
                {payout.paidAt && (
                  <time dateTime={payout.paidAt} className="text-xs text-[#6B7280]">
                    {formatDate(payout.paidAt)}
                  </time>
                )}
              </td>
            </tr>
          ))}
          {payouts.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-[#9CA3AF]">
                {payoutsQuery.isLoading ? 'Chargement...' : 'Aucun virement'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function FinancePage() {
  const [activeTab, setActiveTab] = useState('revenue')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#1A1A1A]">Finance</h1>
        <p className="text-sm text-[#6B7280] mt-1">Commissions, virements et revenus</p>
      </div>

      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4 border-b">
        <TabNav tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <div role="tabpanel" id={`tabpanel-${activeTab}`}>
        {activeTab === 'revenue' ? <RevenueTab /> : null}
        {activeTab === 'commission' ? <CommissionSettings /> : null}
        {activeTab === 'payouts' ? <PayoutsTab /> : null}
      </div>
    </div>
  )
}
