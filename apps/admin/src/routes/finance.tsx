import { createRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Save } from 'lucide-react'
import { TabNav } from '../components/ui/TabNav'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { KpiCard } from '../components/ui/KpiCard'
import { mockRevenueData, mockPartners, mockDashboardKpis } from '../mocks/data'
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

// Mock payout statements
const mockPayouts = [
  {
    id: 'pay-001',
    partnerId: 'partner-003',
    partnerName: 'Island Fresh Market',
    period: '2026-02',
    amount: 18450,
    commission: 3251,
    status: 'PAID',
    paidAt: '2026-02-25T16:00:00Z',
  },
  {
    id: 'pay-002',
    partnerId: 'partner-004',
    partnerName: 'Cafe des Arts',
    period: '2026-02',
    amount: 28600,
    commission: 3432,
    status: 'PENDING',
    paidAt: null,
  },
  {
    id: 'pay-003',
    partnerId: 'partner-003',
    partnerName: 'Island Fresh Market',
    period: '2026-01',
    amount: 15200,
    commission: 2280,
    status: 'PAID',
    paidAt: '2026-01-28T10:00:00Z',
  },
]

function CommissionSettings() {
  const [globalRate, setGlobalRate] = useState(15)
  const [premiumRate, setPremiumRate] = useState(12)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise((r) => setTimeout(r, 800))
    setIsSaving(false)
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
              value={globalRate}
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
              htmlFor="premium-rate"
              className="block text-sm font-semibold text-[#1A1A1A] mb-1.5"
            >
              Taux premium (%)
            </label>
            <input
              id="premium-rate"
              type="number"
              min={0}
              max={50}
              step={0.5}
              value={premiumRate}
              onChange={(e) => setPremiumRate(Number(e.target.value))}
              aria-describedby="premium-rate-desc"
              className="w-32 px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg
                focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
            />
            <p id="premium-rate-desc" className="mt-1 text-xs text-[#9CA3AF]">
              Partenaires genrant plus de Rs 30 000 / mois
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            className="self-start"
            isLoading={isSaving}
            onClick={() => { void handleSave() }}
          >
            <Save className="w-4 h-4" aria-hidden="true" />
            Sauvegarder
          </Button>
        </div>
      </Card>

      {/* Per partner commission */}
      <Card>
        <CardHeader>
          <CardTitle>Commission par partenaire</CardTitle>
        </CardHeader>
        <table className="w-full text-sm" aria-label="Commissions par partenaire">
          <thead>
            <tr className="border-b border-[#E5E7EB]">
              <th scope="col" className="text-left py-2 font-bold text-[#6B7280] text-xs uppercase">Commerce</th>
              <th scope="col" className="text-right py-2 font-bold text-[#6B7280] text-xs uppercase">Taux</th>
              <th scope="col" className="text-right py-2 font-bold text-[#6B7280] text-xs uppercase">Revenu</th>
              <th scope="col" className="text-right py-2 font-bold text-[#6B7280] text-xs uppercase">Commission</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {mockPartners
              .filter((p) => p.status === 'ACTIVE')
              .map((p) => (
                <tr key={p.id}>
                  <td className="py-2.5 text-[#1A1A1A] font-semibold">{p.storeName}</td>
                  <td className="py-2.5 text-right text-[#6B7280]">{p.commissionRate}%</td>
                  <td className="py-2.5 text-right text-[#1A1A1A]">{formatCurrency(p.revenueTotal)}</td>
                  <td className="py-2.5 text-right font-semibold text-[#2E7D32]">
                    {formatCurrency(p.revenueTotal * p.commissionRate / 100)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function RevenueTab() {
  const monthlyData = mockRevenueData.filter((_, i) => i % 7 === 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          label="Revenus du mois"
          value={formatCurrency(mockDashboardKpis.totalRevenue)}
          trend={mockDashboardKpis.revenueGrowth}
          trendLabel="vs mois dernier"
        />
        <KpiCard
          label="Commissions percues"
          value={formatCurrency(mockDashboardKpis.commissionEarned)}
          trend={mockDashboardKpis.commissionGrowth}
          trendLabel="vs mois dernier"
        />
        <KpiCard
          label="Paniers vendus"
          value={mockDashboardKpis.totalBaskets.toLocaleString()}
          trend={mockDashboardKpis.basketsGrowth}
          trendLabel="vs mois dernier"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evolution hebdomadaire</CardTitle>
        </CardHeader>
        <div className="h-60" role="img" aria-label="Graphique revenus hebdomadaires">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `Rs ${Math.round(v / 1000)}k`}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Revenus']}
                contentStyle={{ border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '12px' }}
              />
              <Bar dataKey="revenue" fill="#2E7D32" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}

function PayoutsTab() {
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
            <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase">Statut</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E7EB]">
          {mockPayouts.map((payout) => (
            <tr key={payout.id} className="hover:bg-[#F7F4EF] transition-colors">
              <td className="px-4 py-3 font-semibold text-[#1A1A1A]">{payout.partnerName}</td>
              <td className="px-4 py-3 text-[#6B7280]">{payout.period}</td>
              <td className="px-4 py-3 text-right font-semibold text-[#1A1A1A]">
                {formatCurrency(payout.amount)}
              </td>
              <td className="px-4 py-3 text-right text-[#C62828]">
                -{formatCurrency(payout.commission)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={
                    payout.status === 'PAID'
                      ? 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E8F5E9] text-[#2E7D32]'
                      : 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFF3E0] text-[#E65100]'
                  }
                >
                  {payout.status === 'PAID' ? 'Paye' : 'En attente'}
                </span>
              </td>
              <td className="px-4 py-3 text-[#6B7280]">
                {payout.paidAt ? (
                  <time dateTime={payout.paidAt}>{formatDate(payout.paidAt)}</time>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
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
