'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Inbox,
  PackagePlus,
  RefreshCw,
  Ticket,
  Truck
} from 'lucide-react'
import { toast } from 'sonner'
import { RequireAuth } from '@/components/auth/require-auth'
import { PulseWidgets } from '@/components/admin/pulse-widgets'
import { MetricCard } from '@/components/ui/metric-card'
import { OrderTable } from '@/components/orders/order-table'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Icon } from '@/components/ui/icon'
import { DashboardSkeleton } from '@/components/ui/skeleton'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { orderToSummary } from '@/lib/mappers'
import { cn, formatBdt } from '@/lib/utils'
import type { OrderResponse, OrderStatus, PaymentLedgerRow } from '@/types'

// ─── Domain groupings ───────────────────────────────────────────────────────
// We group the long OrderStatus union into a handful of pipeline phases so the
// dashboard can summarise where work-in-flight is without overwhelming the eye.

const PIPELINE: Array<{
  key: string
  label: string
  hint: string
  icon: typeof Truck
  statuses: OrderStatus[]
  tone: 'navy' | 'blue' | 'cyan' | 'amber' | 'green' | 'red'
}> = [
  {
    key: 'intake',
    label: 'Awaiting pickup',
    hint: 'Confirmed, ready to assign',
    icon: Inbox,
    statuses: ['pending', 'confirmed', 'pickup_assigned'],
    tone: 'navy'
  },
  {
    key: 'production',
    label: 'In production',
    hint: 'Wash, dry-clean, iron',
    icon: Truck,
    statuses: [
      'picked_up',
      'in_wash',
      'wash_complete',
      'in_dry_clean',
      'dry_clean_complete',
      'waiting_for_iron',
      'in_iron',
      'iron_complete'
    ],
    tone: 'cyan'
  },
  {
    key: 'dispatch',
    label: 'Out for delivery',
    hint: 'Assigned or en-route',
    icon: Truck,
    statuses: ['ready', 'delivery_assigned', 'out_for_delivery'],
    tone: 'amber'
  },
  {
    key: 'completed',
    label: 'Delivered today',
    hint: 'Updated in the last 24h',
    icon: Inbox,
    statuses: ['delivered'],
    tone: 'green'
  },
  {
    key: 'exceptions',
    label: 'Needs attention',
    hint: 'Failed, disputed or returned',
    icon: AlertTriangle,
    statuses: ['delivery_failed', 'returned', 'disputed'],
    tone: 'red'
  }
]

const PIPELINE_DOT: Record<string, string> = {
  navy: 'bg-ironman-navy',
  blue: 'bg-blue-500',
  cyan: 'bg-cyan-500',
  amber: 'bg-amber-500',
  green: 'bg-green-500',
  red: 'bg-ironman-red'
}

// ─── Local helpers ──────────────────────────────────────────────────────────

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

function startOfTodayMs() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function isToday(iso: string | undefined | null) {
  if (!iso) return false
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return false
  return t >= startOfTodayMs()
}

function isYesterday(iso: string | undefined | null) {
  if (!iso) return false
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return false
  const start = startOfTodayMs() - DAY_MS
  const end = startOfTodayMs()
  return t >= start && t < end
}

function isLast24h(iso: string | undefined | null) {
  if (!iso) return false
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return false
  return Date.now() - t <= DAY_MS
}

function hoursSince(iso: string) {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return 0
  return (Date.now() - t) / HOUR_MS
}

function formatRelative(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return ''
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function formatClock(date: Date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

// ─── UI primitives local to this dashboard ─────────────────────────────────

function SectionCard({
  title,
  description,
  action,
  children,
  className
}: {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-xl border border-ironman-navy-100 bg-white p-5 shadow-soft', className)}>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-ironman-navy">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </header>
      {children}
    </section>
  )
}

function ProgressBar({ value, max, tone = 'navy' }: { value: number; max: number; tone?: 'navy' | 'red' | 'green' }) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100))
  const barClass =
    tone === 'red' ? 'bg-ironman-red' : tone === 'green' ? 'bg-green-500' : 'bg-ironman-navy'
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-ironman-navy-50"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={cn('h-full transition-all duration-500 ease-out', barClass)} style={{ width: `${pct}%` }} />
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-4 rounded-xl border border-ironman-red-100 bg-ironman-red-50 p-5 text-sm text-ironman-red sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden />
        <div>
          <p className="font-semibold leading-relaxed">We couldn&apos;t load the latest dashboard data.</p>
          <p className="mt-1 text-xs font-normal text-ironman-red/80">{message}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="tap-target focus-ring inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-lg border border-ironman-red/30 bg-white px-4 py-2 text-sm font-semibold text-ironman-red transition-colors hover:bg-ironman-red hover:text-white"
      >
        <RefreshCw className="h-4 w-4" aria-hidden />
        Try again
      </button>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-ironman-navy-100 bg-white p-10 text-center">
      <Inbox className="mx-auto h-10 w-10 text-ironman-navy/50" aria-hidden />
      <h3 className="mt-3 text-lg font-bold text-ironman-navy">No orders yet</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-gray-600">
        Once customers start placing orders, you&apos;ll see live pipeline status, payments, and a feed of recent
        activity right here.
      </p>
      <Link
        href="/admin/orders"
        className="focus-ring mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-ironman-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ironman-navy-dark"
      >
        Open orders console
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  )
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export function AdminDashboard() {
  const token = useAuthStore((state) => state.accessToken)
  const [orders, setOrders] = useState<OrderResponse[]>([])
  const [payments, setPayments] = useState<PaymentLedgerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!token) return
      if (opts?.silent) setRefreshing(true)
      else setLoading(true)
      setError(null)
      try {
        const [nextOrders, nextPayments] = await Promise.all([
          apiFetch<OrderResponse[]>('/admin/orders', { token }),
          apiFetch<PaymentLedgerRow[]>('/payments', { token })
        ])
        setOrders(nextOrders)
        setPayments(nextPayments)
        setLastUpdated(new Date())
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not load dashboard'
        setError(msg)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [token]
  )

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  // ── Derived analytics ───────────────────────────────────────────────────
  const summaries = useMemo(() => orders.map(orderToSummary), [orders])
  const recentSummaries = useMemo(() => summaries.slice(0, 8), [summaries])

  const ordersTodayCount = useMemo(() => orders.filter((o) => isToday(o.createdAt)).length, [orders])
  const ordersYesterdayCount = useMemo(() => orders.filter((o) => isYesterday(o.createdAt)).length, [orders])

  const todayVsYesterday = useMemo(() => {
    if (ordersYesterdayCount === 0) {
      return ordersTodayCount === 0
        ? { label: 'No change', direction: 'flat' as const, intent: 'neutral' as const }
        : { label: 'First day with orders', direction: 'up' as const, intent: 'positive' as const }
    }
    const delta = ordersTodayCount - ordersYesterdayCount
    const pct = Math.round((delta / ordersYesterdayCount) * 100)
    return {
      label: `${pct >= 0 ? '+' : ''}${pct}% vs yesterday`,
      direction: pct === 0 ? ('flat' as const) : pct > 0 ? ('up' as const) : ('down' as const),
      intent: pct === 0 ? ('neutral' as const) : pct > 0 ? ('positive' as const) : ('negative' as const)
    }
  }, [ordersTodayCount, ordersYesterdayCount])

  const revenueTotal = useMemo(
    () => payments.reduce((sum, p) => sum + Number(p.amount || 0), 0),
    [payments]
  )
  const revenueToday = useMemo(
    () => payments.filter((p) => isToday(p.collectedAt)).reduce((sum, p) => sum + Number(p.amount || 0), 0),
    [payments]
  )
  const revenueVerified = useMemo(
    () => payments.filter((p) => p.verified).reduce((sum, p) => sum + Number(p.amount || 0), 0),
    [payments]
  )
  const revenueUnverified = revenueTotal - revenueVerified

  // Payment-method split (COD vs online)
  const isCod = (p: PaymentLedgerRow) => p.paymentType === 'cod_pickup' || p.paymentType === 'cod_delivery'
  const revenueCod = useMemo(
    () => payments.filter(isCod).reduce((sum, p) => sum + Number(p.amount || 0), 0),
    [payments]
  )
  const revenueOnline = revenueTotal - revenueCod

  // Outstanding (invoiced but not yet paid)
  const outstandingAmount = useMemo(
    () =>
      orders.reduce((sum, o) => {
        if (o.status === 'cancelled') return sum
        return sum + Math.max(0, Number(o.totalAmount || 0) - Number(o.paidAmount || 0))
      }, 0),
    [orders]
  )

  // Pipeline counts
  const pipelineCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const phase of PIPELINE) {
      counts[phase.key] =
        phase.key === 'completed'
          ? orders.filter((o) => phase.statuses.includes(o.status) && isLast24h(o.updatedAt)).length
          : orders.filter((o) => phase.statuses.includes(o.status)).length
    }
    return counts
  }, [orders])

  const activeWorkload = useMemo(
    () =>
      orders.filter((o) =>
        [...PIPELINE[0].statuses, ...PIPELINE[1].statuses, ...PIPELINE[2].statuses].includes(o.status)
      ).length,
    [orders]
  )

  // Attention queue counts
  const unverifiedPayments = useMemo(() => payments.filter((p) => !p.verified).length, [payments])
  const unappliedPayments = useMemo(() => payments.filter((p) => !p.appliedToBalance).length, [payments])
  const pendingCodOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.paymentMethod === 'cod' &&
          o.codConfirmationStatus &&
          o.codConfirmationStatus !== 'delivery_confirmed' &&
          o.status === 'delivered'
      ).length,
    [orders]
  )
  const staleActiveOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          !['delivered', 'cancelled', 'returned'].includes(o.status) &&
          hoursSince(o.updatedAt) > 48
      ).length,
    [orders]
  )

  const totalAttention = unverifiedPayments + pendingCodOrders + staleActiveOrders

  // ── Render guards ──────────────────────────────────────────────────────
  const handleRetry = () => {
    void load()
  }
  const handleRefresh = () => {
    void load({ silent: true })
  }

  return (
    <RequireAuth roles={['admin']}>
      {loading ? (
        <DashboardSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={handleRetry} />
      ) : orders.length === 0 && payments.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          {/* ── Page header bar ─────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600">
              {lastUpdated ? (
                <>
                  Updated <time dateTime={lastUpdated.toISOString()}>{formatClock(lastUpdated)}</time>
                </>
              ) : (
                'Just loaded'
              )}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                aria-label="Refresh dashboard"
                className="focus-ring inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-ironman-navy-100 bg-white px-3 text-sm font-semibold text-ironman-navy transition-colors hover:bg-ironman-navy-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} aria-hidden />
                {refreshing ? 'Refreshing' : 'Refresh'}
              </button>
              <Link
                href="/admin/orders"
                className="focus-ring inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-ironman-red px-3 text-sm font-semibold text-white transition-colors hover:bg-ironman-red-dark"
              >
                <PackagePlus className="h-4 w-4" aria-hidden />
                Orders console
              </Link>
            </div>
          </div>

          {/* ── Pulse widgets (Recharts) ─────────────────────────────────── */}
          <ErrorBoundary title="The pulse widgets hit an error.">
            <PulseWidgets orders={orders} payments={payments} />
          </ErrorBoundary>

          {/* ── KPI row ─────────────────────────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Orders today"
              value={String(ordersTodayCount)}
              hint={`${orders.length.toLocaleString()} total · ${ordersYesterdayCount} yesterday`}
              trend={{
                label: todayVsYesterday.label,
                direction: todayVsYesterday.direction,
                intent: todayVsYesterday.intent
              }}
              icon="PackageCheck"
              tone="red"
            />
            <MetricCard
              label="Revenue logged"
              value={formatBdt(revenueTotal)}
              hint={`${formatBdt(revenueToday)} collected today`}
              icon="WalletCards"
              tone="navy"
            />
            <MetricCard
              label="Active workload"
              value={String(activeWorkload)}
              hint="Pickups, production and dispatch"
              icon="Truck"
            />
            <MetricCard
              label="Needs attention"
              value={String(totalAttention)}
              hint={`${unverifiedPayments} unverified · ${staleActiveOrders} stale`}
              icon="AlertOctagon"
              tone={totalAttention > 0 ? 'red' : 'plain'}
            />
          </div>

          {/* ── Pipeline + Revenue split ──────────────────────────────── */}
          <div className="grid gap-4 lg:grid-cols-3">
            <SectionCard
              className="lg:col-span-2"
              title="Order pipeline"
              description="Where today's work is sitting right now"
              action={
                <Link
                  href="/admin/orders"
                  className="focus-ring inline-flex items-center gap-1 text-sm font-semibold text-ironman-red"
                >
                  All orders
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              }
            >
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {PIPELINE.map((phase) => {
                  const count = pipelineCounts[phase.key] ?? 0
                  return (
                    <li key={phase.key}>
                      <Link
                        href="/admin/orders"
                        className="focus-ring group flex h-full items-start gap-3 rounded-lg border border-ironman-navy-100 bg-ironman-navy-50/40 p-3 transition-colors hover:border-ironman-navy/30 hover:bg-white"
                      >
                        <span
                          className={cn(
                            'mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full',
                            PIPELINE_DOT[phase.tone]
                          )}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="truncate text-sm font-semibold text-ironman-navy">{phase.label}</p>
                            <p className="font-display text-xl font-bold text-ironman-navy">{count}</p>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-gray-500">{phase.hint}</p>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </SectionCard>

            <SectionCard
              title="Revenue & payments"
              description={`${payments.length.toLocaleString()} ledger entries`}
            >
              <dl className="space-y-4">
                <div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-sm text-gray-600">Verified</dt>
                    <dd className="text-sm font-semibold text-ironman-navy">{formatBdt(revenueVerified)}</dd>
                  </div>
                  <div className="mt-1">
                    <ProgressBar value={revenueVerified} max={revenueTotal} tone="green" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-sm text-gray-600">Awaiting verification</dt>
                    <dd className="text-sm font-semibold text-ironman-navy">{formatBdt(revenueUnverified)}</dd>
                  </div>
                  <div className="mt-1">
                    <ProgressBar value={revenueUnverified} max={revenueTotal} tone="red" />
                  </div>
                </div>
                <div className="border-t border-ironman-navy-100 pt-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-sm text-gray-600">Cash on delivery</dt>
                    <dd className="text-sm font-semibold text-ironman-navy">{formatBdt(revenueCod)}</dd>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between gap-3">
                    <dt className="text-sm text-gray-600">Online / merchant</dt>
                    <dd className="text-sm font-semibold text-ironman-navy">{formatBdt(revenueOnline)}</dd>
                  </div>
                </div>
                <div className="rounded-lg bg-ironman-navy-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Outstanding invoiced</p>
                  <p className="mt-1 font-display text-lg font-bold text-ironman-navy">{formatBdt(outstandingAmount)}</p>
                </div>
              </dl>
            </SectionCard>
          </div>

          {/* ── Attention queue + Quick actions ───────────────────────── */}
          <div className="grid gap-4 lg:grid-cols-3">
            <SectionCard
              className="lg:col-span-2"
              title="Needs your attention"
              description="Items in this list block payments or cause downstream delays"
            >
              {totalAttention === 0 ? (
                <p className="rounded-lg border border-dashed border-ironman-navy-100 bg-white p-5 text-center text-sm text-gray-600">
                  All clear — no urgent items right now.
                </p>
              ) : (
                <ul className="divide-y divide-ironman-navy-100">
                  <AttentionRow
                    icon="WalletCards"
                    title="Unverified payments"
                    count={unverifiedPayments}
                    helper="Ledger rows not yet confirmed against the bank/Mobile Financial provider."
                    href="/admin/payments"
                  />
                  <AttentionRow
                    icon="WalletCards"
                    title="Payments not applied"
                    count={unappliedPayments}
                    helper="Received but not reconciled to an order balance."
                    href="/admin/payments"
                  />
                  <AttentionRow
                    icon="PackageCheck"
                    title="COD awaiting confirmation"
                    count={pendingCodOrders}
                    helper="Delivered orders where the customer hasn't confirmed COD yet."
                    href="/admin/orders"
                  />
                  <AttentionRow
                    icon="Clock3"
                    title="Stale active orders"
                    count={staleActiveOrders}
                    helper="Active orders with no status change in over 48 hours."
                    href="/admin/orders"
                  />
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Quick actions" description="Common admin tasks">
              <div className="grid gap-2">
                <QuickAction href="/admin/assignments" label="Manage assignments" hint="Pickups & deliveries" icon="Truck" />
                <QuickAction href="/admin/pricing" label="Update pricing" hint="Service × clothing grid" icon="WalletCards" />
                <QuickAction href="/admin/coupons" label="Coupons" hint="Promotions & discounts" iconComponent={Ticket} />
                <QuickAction href="/admin/broadcasts" label="Send broadcast" hint="Notify customers" icon="Send" />
                <QuickAction href="/admin/reports" label="Open reports" hint="Revenue & operations" icon="PackageCheck" />
              </div>
            </SectionCard>
          </div>

          {/* ── Recent orders ───────────────────────────────────────────── */}
          <SectionCard
            title="Live order feed"
            description="Latest orders across the system"
            action={
              <Link
                href="/admin/orders"
                className="focus-ring inline-flex items-center gap-1 text-sm font-semibold text-ironman-red"
              >
                Manage orders
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            }
          >
            {recentSummaries.length === 0 ? (
              <p className="rounded-lg border border-dashed border-ironman-navy-100 bg-white p-5 text-center text-sm text-gray-600">
                No orders yet.
              </p>
            ) : (
              <>
                <OrderTable orders={recentSummaries} baseHref="/admin/orders" />
                {summaries.length > recentSummaries.length && (
                  <p className="mt-3 text-xs text-gray-500">
                    Showing the most recent {recentSummaries.length} of {summaries.length.toLocaleString()} orders.
                  </p>
                )}
              </>
            )}
          </SectionCard>

          {/* Live region for screen readers when refresh completes */}
          <div className="sr-only" aria-live="polite" role="status">
            {refreshing ? 'Refreshing dashboard' : lastUpdated ? `Dashboard updated at ${formatClock(lastUpdated)}` : ''}
          </div>
        </div>
      )}
    </RequireAuth>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function AttentionRow({
  title,
  helper,
  count,
  href,
  icon
}: {
  title: string
  helper: string
  count: number
  href: string
  icon: string
}) {
  const muted = count === 0
  return (
    <li>
      <Link
        href={href}
        className={cn(
          'focus-ring group flex items-center gap-4 py-3 transition-colors',
          muted ? 'text-gray-500' : 'text-ironman-navy hover:text-ironman-red'
        )}
        aria-disabled={muted}
      >
        <span
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
            muted ? 'bg-ironman-navy-50 text-ironman-navy/60' : 'bg-ironman-red-50 text-ironman-red'
          )}
          aria-hidden
        >
          <DashboardIcon name={icon} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold">{title}</p>
            <p className={cn('font-display text-lg font-bold', muted ? 'text-gray-400' : 'text-ironman-navy')}>
              {count}
            </p>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">{helper}</p>
        </div>
        <ArrowRight
          className={cn(
            'h-4 w-4 flex-shrink-0 transition-transform',
            !muted && 'group-hover:translate-x-1'
          )}
          aria-hidden
        />
      </Link>
    </li>
  )
}

function QuickAction({
  href,
  label,
  hint,
  icon,
  iconComponent: IconComponent
}: {
  href: string
  label: string
  hint: string
  icon?: string
  iconComponent?: typeof Ticket
}) {
  return (
    <Link
      href={href}
      className="focus-ring group flex items-center gap-3 rounded-lg border border-ironman-navy-100 bg-white p-3 transition-all hover:border-ironman-navy/30 hover:bg-ironman-navy-50/50"
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-ironman-navy-50 text-ironman-navy">
        {IconComponent ? (
          <IconComponent className="h-4 w-4" aria-hidden />
        ) : icon ? (
          <DashboardIcon name={icon} />
        ) : null}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ironman-navy">{label}</p>
        <p className="truncate text-xs text-gray-500">{hint}</p>
      </div>
      <ArrowRight className="h-4 w-4 flex-shrink-0 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-ironman-red" aria-hidden />
    </Link>
  )
}

function DashboardIcon({ name }: { name: string }) {
  return <Icon name={name} className="h-4 w-4" aria-hidden />
}
