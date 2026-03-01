import { createRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  Building2,
  ShoppingBag,
  Users,
  Shield,
  Banknote,
  TrendingUp,
  Store,
  AlertCircle,
  CheckCircle,
  DollarSign,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react'
import { KpiCard } from '../components/ui/KpiCard'
import { StatCard } from '../components/ui/StatCard'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { DateRangePicker } from '../components/ui/DateRangePicker'
import { useKpis, useDailyFocus, useRevenueChart, useRecentActivity } from '../hooks/use-dashboard'
import type { PeriodFilter } from '../api/types'
import { formatCurrency, formatRelativeTime } from '../lib/utils'
import { Route as rootRoute } from './__root'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
})

const activityIcons: Record<string, React.ReactNode> = {
  PARTNER_REGISTERED: <Store className="w-4 h-4 text-green-500" aria-hidden="true" />,
  CLAIM_OPENED: <AlertCircle className="w-4 h-4 text-red-700" aria-hidden="true" />,
  RESERVATION_COMPLETED: <CheckCircle className="w-4 h-4 text-green-700" aria-hidden="true" />,
  CONSUMER_BANNED: <Shield className="w-4 h-4 text-neutral-600" aria-hidden="true" />,
  PAYOUT_APPROVED: <DollarSign className="w-4 h-4 text-orange-500" aria-hidden="true" />,
  FRAUD_ALERT: <AlertTriangle className="w-4 h-4 text-red-700" aria-hidden="true" />,
}

const activityBadgeConfig: Record<string, { variant: 'pending' | 'open' | 'banned' | 'resolved' | 'active' | 'high'; label: string }> = {
  PARTNER_REGISTERED: { variant: 'pending', label: 'Partenaire' },
  CLAIM_OPENED: { variant: 'open', label: 'Reclamation' },
  RESERVATION_COMPLETED: { variant: 'active', label: 'Reservation' },
  CONSUMER_BANNED: { variant: 'banned', label: 'Consommateur' },
  PAYOUT_APPROVED: { variant: 'resolved', label: 'Finance' },
  FRAUD_ALERT: { variant: 'high', label: 'Fraude' },
}

function DashboardPage() {
  const [period, setPeriod] = useState<PeriodFilter>('today')
  const kpisQuery = useKpis(period)
  const dailyFocusQuery = useDailyFocus()
  const revenueQuery = useRevenueChart(period)
  const activityQuery = useRecentActivity()

  const kpis = kpisQuery.data
  const dailyFocus = dailyFocusQuery.data
  const revenueData = revenueQuery.data
  const activity = activityQuery.data

  const handleRefresh = useCallback(() => {
    void kpisQuery.refetch()
    void dailyFocusQuery.refetch()
    void revenueQuery.refetch()
    void activityQuery.refetch()
  }, [kpisQuery, dailyFocusQuery, revenueQuery, activityQuery])

  const handlePeriodChange = (newPeriod: PeriodFilter) => {
    setPeriod(newPeriod)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header with period selector and refresh */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900">Tableau de bord</h1>
          <p className="text-sm text-neutral-600 mt-1">Vue d'ensemble en temps reel</p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker value={period} onChange={handlePeriodChange} />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            isLoading={kpisQuery.isFetching}
            aria-label="Actualiser les donnees"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* US-A001: 7 KPIs */}
      <section aria-label="Indicateurs cles de performance">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            label="Consommateurs inscrits"
            value={kpis?.totalConsumers.toLocaleString('fr-MU') ?? '-'}
            trend={kpis?.consumersGrowth ?? 0}
            trendLabel="vs periode precedente"
            icon={<Users className="w-5 h-5" />}
          />
          <KpiCard
            label="Partenaires actifs"
            value={kpis?.activePartners.toString() ?? '-'}
            trend={kpis?.partnersGrowth ?? 0}
            trendLabel="vs periode precedente"
            icon={<Building2 className="w-5 h-5" />}
          />
          <KpiCard
            label="Paniers sauves"
            value={kpis?.basketsSaved.toLocaleString('fr-MU') ?? '-'}
            trend={kpis?.basketsGrowth ?? 0}
            trendLabel="vs periode precedente"
            icon={<ShoppingBag className="w-5 h-5" />}
          />
          <KpiCard
            label="CA Total"
            value={kpis ? formatCurrency(kpis.totalRevenue) : '-'}
            trend={kpis?.revenueGrowth ?? 0}
            trendLabel="vs periode precedente"
            icon={<Banknote className="w-5 h-5" />}
          />
          <KpiCard
            label="Revenu BienBon"
            value={kpis ? formatCurrency(kpis.commissionEarned) : '-'}
            trend={kpis?.commissionGrowth ?? 0}
            trendLabel="vs periode precedente"
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <KpiCard
            label="Reservations du jour"
            value={kpis ? `${kpis.reservationsToday}` : '-'}
            trend={kpis?.reservationsGrowth ?? 0}
            trendLabel={kpis ? `${kpis.reservationsTodayCompleted} completees + ${kpis.reservationsTodayInProgress} en cours` : ''}
            icon={<ShoppingBag className="w-5 h-5" />}
          />
          <KpiCard
            label="Reclamations ouvertes"
            value={kpis?.openClaims.toString() ?? '-'}
            trend={kpis?.claimsGrowth ?? 0}
            trendLabel="vs periode precedente"
            icon={<Shield className="w-5 h-5" />}
            className={kpis && kpis.openClaims > 0 ? 'border-red-700/30' : ''}
          />
        </div>
        {/* Claims urgency indicators */}
        {kpis && (kpis.claimsOver24h > 0 || kpis.claimsOver48h > 0) ? (
          <div className="flex items-center gap-3 mt-2 text-xs">
            {kpis.claimsOver48h > 0 ? (
              <span className="text-red-700 font-bold">
                {kpis.claimsOver48h} {'>'} 48h (critique)
              </span>
            ) : null}
            {kpis.claimsOver24h > 0 ? (
              <span className="text-orange-600 font-semibold">
                {kpis.claimsOver24h} {'>'} 24h (urgent)
              </span>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* US-A003: Focus du jour */}
      {dailyFocus ? (
        <section aria-label="Focus du jour">
          <Card>
            <CardHeader>
              <CardTitle>Focus du jour</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard
                label="Paniers publies"
                value={dailyFocus.basketsPublished}
                currentValue={dailyFocus.basketsPublished}
                previousValue={dailyFocus.basketsPublishedYesterday}
                previousLabel="vs veille"
                secondPreviousValue={dailyFocus.basketsPublishedLastWeek}
                secondPreviousLabel="vs semaine derniere"
              />
              <StatCard
                label="Reservations"
                value={dailyFocus.reservations}
                currentValue={dailyFocus.reservations}
                previousValue={dailyFocus.reservationsYesterday}
                previousLabel="vs veille"
                secondPreviousValue={dailyFocus.reservationsLastWeek}
                secondPreviousLabel="vs semaine derniere"
              />
              <StatCard
                label="Retraits effectues"
                value={dailyFocus.pickupsCompleted}
                currentValue={dailyFocus.pickupsCompleted}
                previousValue={dailyFocus.pickupsYesterday}
                previousLabel="vs veille"
                secondPreviousValue={dailyFocus.pickupsLastWeek}
                secondPreviousLabel="vs semaine derniere"
              />
              <StatCard
                label="CA du jour"
                value={formatCurrency(dailyFocus.dailyRevenue)}
                currentValue={dailyFocus.dailyRevenue}
                previousValue={dailyFocus.dailyRevenueYesterday}
                previousLabel="vs veille"
                secondPreviousValue={dailyFocus.dailyRevenueLastWeek}
                secondPreviousLabel="vs semaine derniere"
              />
            </div>
          </Card>
        </section>
      ) : null}

      {/* US-A001: Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Evolution du CA</CardTitle>
          </CardHeader>
          <div className="h-52" role="img" aria-label="Graphique evolution du chiffre d'affaires">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData ?? []} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-green-700)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--color-green-700)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-neutral-200)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'var(--color-neutral-400)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--color-neutral-400)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `Rs ${Math.round(v / 1000)}k`}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Revenus']}
                  labelFormatter={(label: string) => `Date: ${label}`}
                  contentStyle={{
                    border: '1px solid var(--color-neutral-200)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-green-700)"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Paniers sauves</CardTitle>
          </CardHeader>
          <div className="h-52" role="img" aria-label="Graphique paniers sauves">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData ?? []} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="basketsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-orange-500)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--color-orange-500)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-neutral-200)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'var(--color-neutral-400)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--color-neutral-400)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value: number) => [value, 'Paniers']}
                  labelFormatter={(label: string) => `Date: ${label}`}
                  contentStyle={{
                    border: '1px solid var(--color-neutral-200)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="baskets"
                  stroke="var(--color-orange-500)"
                  strokeWidth={2}
                  fill="url(#basketsGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* US-A003: Notable events / Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Evenements notables</CardTitle>
        </CardHeader>
        <ol aria-label="Flux d'activite recent" className="divide-y divide-neutral-200">
          {(activity ?? []).map((event) => {
            const badgeConfig = activityBadgeConfig[event.type]
            return (
              <li key={event.id} className="flex items-start gap-3 py-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-50 flex items-center justify-center mt-0.5">
                  {activityIcons[event.type] ?? (
                    <AlertCircle className="w-4 h-4 text-neutral-400" aria-hidden="true" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-900">{event.description}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    <span className="font-semibold">{event.actor}</span>
                    {' \u00B7 '}
                    <time dateTime={event.timestamp}>{formatRelativeTime(event.timestamp)}</time>
                  </p>
                </div>
                {badgeConfig ? (
                  <Badge variant={badgeConfig.variant}>{badgeConfig.label}</Badge>
                ) : (
                  <Badge variant="default">{event.type}</Badge>
                )}
              </li>
            )
          })}
        </ol>
      </Card>
    </div>
  )
}
