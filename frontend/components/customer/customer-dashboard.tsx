'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  HelpCircle,
  Inbox,
  ListChecks,
  MapPin,
  PackagePlus,
  RefreshCw,
  Truck,
  UserRound,
  Wallet
} from 'lucide-react'
import { toast } from 'sonner'
import { RequireAuth } from '@/components/auth/require-auth'
import { MetricCard } from '@/components/ui/metric-card'
import { StatusBadge } from '@/components/ui/status-badge'
import { OrderTable } from '@/components/orders/order-table'
import { TableSkeleton } from '@/components/ui/skeleton'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { orderToSummary } from '@/lib/mappers'
import { cn, formatBdt, statusLabel } from '@/lib/utils'
import type { OrderResponse, OrderSearchResponse, OrderStatus, PaymentMethod } from '@/types'

const WIDE_PAGE_SIZE = 200
const RECENT_COUNT = 8

// Priority for choosing the single "headline" in-flight order to feature.
// Higher = more relevant to the customer right now.
const STATUS_PRIORITY: Partial<Record<OrderStatus, number>> = {
  out_for_delivery: 100,
  delivery_assigned: 90,
  ready: 85,
  in_iron: 80,
  iron_complete: 75,
  waiting_for_iron: 70,
  in_dry_clean: 65,
  dry_clean_complete: 60,
  in_wash: 55,
  wash_complete: 50,
  picked_up: 45,
  pickup_assigned: 40,
  confirmed: 30,
  pending: 20
}

const TERMINAL_STATUSES: OrderStatus[] = ['delivered', 'cancelled', 'returned', 'disputed', 'delivery_failed']

const PHASE_FOR_STATUS: Partial<Record<OrderStatus, string>> = {
  pending: 'Awaiting confirmation',
  confirmed: 'Confirmed — pickup being scheduled',
  pickup_assigned: 'Pickup scheduled',
  picked_up: 'Picked up · heading to facility',
  in_wash: 'Washing in progress',
  wash_complete: 'Wash complete',
  in_dry_clean: 'Dry cleaning in progress',
  dry_clean_complete: 'Dry clean complete',
  waiting_for_iron: 'Queued for ironing',
  in_iron: 'Ironing in progress',
  iron_complete: 'Ironing complete',
  ready: 'Ready · packing for delivery',
  delivery_assigned: 'Delivery scheduled',
  out_for_delivery: 'Out for delivery — almost there'
}

function isTerminal(status: OrderStatus) {
  return (TERMINAL_STATUSES as OrderStatus[]).includes(status)
}

function pickActiveOrder(orders: OrderResponse[]): OrderResponse | null {
  const inFlight = orders.filter((o) => !isTerminal(o.status))
  if (inFlight.length === 0) return null
  return inFlight
    .slice()
    .sort((a, b) => {
      const pa = STATUS_PRIORITY[a.status] ?? 0
      const pb = STATUS_PRIORITY[b.status] ?? 0
      if (pb !== pa) return pb - pa
      // Tie-break by most recent update so the active card always feels live.
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })[0]
}

// ─── Payment-due categorization ─────────────────────────────────────────────
// Three buckets, in descending urgency:
//   overdue   — order is delivered but balance is still outstanding
//   pending   — non-COD method + balance > 0, order still in flight (gateway not completed)
//   cod       — COD method + balance > 0, order still in flight (cash expected at pickup/delivery)
// Cancelled orders are excluded; the banner picks the highest-urgency bucket.

type DueEntry = {
  orderId: string
  orderNumber: string
  amount: number
  method: PaymentMethod
}

type DueSummary = {
  overdue: DueEntry[]
  pending: DueEntry[]
  cod: DueEntry[]
}

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cod: 'cash',
  online: 'online',
  bkash: 'bKash',
  nagad: 'Nagad',
  rocket: 'Rocket',
  card: 'card'
}

function summarizeDue(orders: OrderResponse[]): DueSummary {
  const overdue: DueEntry[] = []
  const pending: DueEntry[] = []
  const cod: DueEntry[] = []
  for (const o of orders) {
    if (o.status === 'cancelled') continue
    const amount = Math.max(0, Number(o.totalAmount) - Number(o.paidAmount))
    if (amount <= 0) continue
    const entry: DueEntry = { orderId: o.id, orderNumber: o.orderNumber, amount, method: o.paymentMethod }
    if (o.status === 'delivered') overdue.push(entry)
    else if (o.paymentMethod === 'cod') cod.push(entry)
    else pending.push(entry)
  }
  // Largest balance first so banner's deep-link targets the most material order.
  const byAmountDesc = (a: DueEntry, b: DueEntry) => b.amount - a.amount
  overdue.sort(byAmountDesc)
  pending.sort(byAmountDesc)
  cod.sort(byAmountDesc)
  return { overdue, pending, cod }
}

function sumAmount(entries: DueEntry[]): number {
  return entries.reduce((s, e) => s + e.amount, 0)
}

function firstName(fullName: string | undefined) {
  if (!fullName) return null
  const trimmed = fullName.trim()
  if (!trimmed) return null
  const first = trimmed.split(/\s+/)[0]
  return first.charAt(0).toUpperCase() + first.slice(1)
}

function formatSlotDate(iso: string) {
  // Backend supplies date as YYYY-MM-DD; we format locally without time-zone noise.
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatClock(date: Date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

// ─── Local UI primitives ────────────────────────────────────────────────────

function SectionHeader({
  title,
  description,
  action
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-bold text-ironman-navy">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
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
          <p className="font-semibold leading-relaxed">We couldn&apos;t load your dashboard.</p>
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

function ActiveOrderCard({ order, dueAmount }: { order: OrderResponse; dueAmount: number }) {
  const phase = PHASE_FOR_STATUS[order.status] ?? statusLabel(order.status)
  const isOutForDelivery = order.status === 'out_for_delivery'
  const hasBalance = dueAmount > 0

  return (
    <section
      aria-labelledby="active-order-heading"
      className="relative overflow-hidden rounded-2xl border border-ironman-navy-100 bg-gradient-to-br from-ironman-navy to-ironman-navy-dark p-5 text-white shadow-soft sm:p-6"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-ironman-red/15 blur-3xl" aria-hidden />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-ironman-red">Active order</p>
            <h2 id="active-order-heading" className="mt-1 truncate font-display text-xl font-bold sm:text-2xl">
              {order.orderNumber}
            </h2>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <p className="mt-3 text-sm text-white/85">
          {isOutForDelivery && <Truck className="mb-0.5 mr-1.5 inline h-4 w-4" aria-hidden />}
          {phase}
        </p>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-white/5 p-3">
            <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-white/55">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden />
              Pickup
            </dt>
            <dd className="mt-1 text-sm font-semibold">
              {formatSlotDate(order.preferredPickupDate)} · {order.preferredPickupTimeSlot}
            </dd>
          </div>
          <div className="rounded-lg bg-white/5 p-3">
            <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-white/55">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden />
              Delivery
            </dt>
            <dd className="mt-1 text-sm font-semibold">
              {formatSlotDate(order.preferredDeliveryDate)} · {order.preferredDeliveryTimeSlot}
            </dd>
          </div>
        </dl>

        {hasBalance && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ironman-red/40 bg-ironman-red/10 px-3 py-2.5 text-sm">
            <span>
              Balance due: <strong className="font-semibold text-white">{formatBdt(dueAmount)}</strong>
            </span>
            <Link
              href={`/customer/orders/${order.id}`}
              className="focus-ring inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-ironman-red transition-colors hover:bg-ironman-red-50"
            >
              Pay now
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={`/customer/orders/${order.id}`}
            className="focus-ring tap-target inline-flex items-center justify-center gap-2 rounded-lg bg-ironman-red px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ironman-red-dark"
          >
            View &amp; track
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href={`/track?order=${encodeURIComponent(order.orderNumber)}`}
            className="focus-ring tap-target inline-flex items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            <MapPin className="h-4 w-4" aria-hidden />
            Quick track
          </Link>
        </div>
      </div>
    </section>
  )
}

function PaymentDueBanner({ summary }: { summary: DueSummary }) {
  // Show the highest-urgency non-empty bucket. Returns null when nothing is due.
  if (summary.overdue.length > 0) {
    const total = sumAmount(summary.overdue)
    const head = summary.overdue[0]
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ironman-red-100 bg-ironman-red-50 px-4 py-3 text-sm text-ironman-red-dark"
      >
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-ironman-red" aria-hidden />
          <p className="leading-relaxed">
            <strong className="font-semibold">Payment overdue.</strong>{' '}
            {summary.overdue.length === 1 ? (
              <>
                Order {head.orderNumber} has <strong>{formatBdt(total)}</strong> outstanding.
              </>
            ) : (
              <>
                <strong>{formatBdt(total)}</strong> across {summary.overdue.length} delivered orders.
              </>
            )}
          </p>
        </div>
        <Link
          href={`/customer/orders/${head.orderId}`}
          className="focus-ring inline-flex items-center gap-1.5 rounded-md bg-ironman-red px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-ironman-red-dark"
        >
          Settle now
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    )
  }

  if (summary.pending.length > 0) {
    const total = sumAmount(summary.pending)
    const head = summary.pending[0]
    const methodLabel = METHOD_LABEL[head.method] ?? 'online'
    return (
      <div
        role="status"
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        <div className="flex items-start gap-2.5">
          <Wallet className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" aria-hidden />
          <p className="leading-relaxed">
            {summary.pending.length === 1 ? (
              <>
                <strong className="font-semibold">Complete {methodLabel} payment</strong> for order {head.orderNumber}:{' '}
                <strong>{formatBdt(total)}</strong>.
              </>
            ) : (
              <>
                <strong>{formatBdt(total)}</strong> awaiting online payment across {summary.pending.length} orders.
              </>
            )}
          </p>
        </div>
        <Link
          href={`/customer/orders/${head.orderId}`}
          className="focus-ring inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
        >
          Pay now
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    )
  }

  if (summary.cod.length > 0) {
    const total = sumAmount(summary.cod)
    const head = summary.cod[0]
    return (
      <div
        role="status"
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ironman-navy-100 bg-ironman-navy-50/80 px-4 py-3 text-sm text-ironman-navy"
      >
        <div className="flex items-start gap-2.5">
          <Wallet className="mt-0.5 h-4 w-4 flex-shrink-0 text-ironman-navy/80" aria-hidden />
          <p className="leading-relaxed">
            {summary.cod.length === 1 ? (
              <>
                Have <strong>{formatBdt(total)}</strong> in cash ready for order {head.orderNumber}.
              </>
            ) : (
              <>
                Have <strong>{formatBdt(total)}</strong> in cash ready across {summary.cod.length} upcoming orders.
              </>
            )}
          </p>
        </div>
        <Link
          href={`/customer/orders/${head.orderId}`}
          className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-ironman-navy/20 bg-white px-3 py-1.5 text-xs font-semibold text-ironman-navy transition-colors hover:bg-ironman-navy-50"
        >
          View order
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    )
  }

  return null
}

// ─── Recent orders — card list on mobile, table on md+ ──────────────────────

function RecentOrdersCardList({
  orders,
  baseHref
}: {
  orders: OrderResponse[]
  baseHref: string
}) {
  return (
    <ul className="space-y-3">
      {orders.map((order) => {
        const due = Math.max(0, Number(order.totalAmount) - Number(order.paidAmount))
        const itemsCount = order.items.reduce((sum, item) => sum + Number(item.quantity), 0)
        return (
          <li key={order.id}>
            <Link
              href={`${baseHref}/${order.id}`}
              className="focus-ring flex flex-col gap-3 rounded-xl border border-ironman-navy-100 bg-white p-4 shadow-soft transition-colors hover:border-ironman-navy/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ironman-navy">{order.orderNumber}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {itemsCount} item{itemsCount === 1 ? '' : 's'} · {formatBdt(Number(order.totalAmount))}
                  </p>
                </div>
                <StatusBadge status={order.status} />
              </div>
              {due > 0 && (
                <p className="text-xs font-semibold text-ironman-red">
                  Balance due: {formatBdt(due)}
                </p>
              )}
              <div className="flex items-center justify-end text-xs font-semibold text-ironman-red">
                View order
                <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export function CustomerDashboard() {
  const token = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)
  const [orders, setOrders] = useState<OrderResponse[]>([])
  const [totalElements, setTotalElements] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!token) return
      if (opts?.silent) setRefreshing(true)
      else setLoading(true)
      setError(null)
      try {
        const wide = await apiFetch<OrderSearchResponse>(
          `/orders/search?page=0&size=${WIDE_PAGE_SIZE}`,
          { token }
        )
        setOrders(wide.content)
        setTotalElements(wide.totalElements)
        setLastUpdated(new Date())
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not load orders'
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

  // ── Derived ────────────────────────────────────────────────────────────
  const activeOrder = useMemo(() => pickActiveOrder(orders), [orders])
  const activeOrders = useMemo(() => orders.filter((o) => !isTerminal(o.status)), [orders])
  const deliveredOrders = useMemo(() => orders.filter((o) => o.status === 'delivered'), [orders])
  const totalDue = useMemo(
    () =>
      orders.reduce((sum, o) => {
        if (o.status === 'cancelled') return sum
        return sum + Math.max(0, Number(o.totalAmount) - Number(o.paidAmount))
      }, 0),
    [orders]
  )
  const dueSummary = useMemo(() => summarizeDue(orders), [orders])

  const activeOrderDue = activeOrder
    ? Math.max(0, Number(activeOrder.totalAmount) - Number(activeOrder.paidAmount))
    : 0

  // Phase breakdown for the active KPI hint.
  const activeBreakdown = useMemo(() => {
    const inProduction = activeOrders.filter((o) =>
      ['picked_up', 'in_wash', 'wash_complete', 'in_dry_clean', 'dry_clean_complete', 'waiting_for_iron', 'in_iron', 'iron_complete'].includes(o.status)
    ).length
    const onTheWay = activeOrders.filter((o) =>
      ['ready', 'delivery_assigned', 'out_for_delivery'].includes(o.status)
    ).length
    return { inProduction, onTheWay }
  }, [activeOrders])

  const recentOrders = useMemo(() => orders.slice(0, RECENT_COUNT), [orders])
  const recentSummaries = useMemo(() => recentOrders.map(orderToSummary), [recentOrders])

  const greetingName = firstName(user?.fullName)
  const handleRetry = () => void load()
  const handleRefresh = () => void load({ silent: true })

  // The "showing X of N" caveat — only surfaced when the backend has more than we fetched.
  const capped = totalElements !== null && totalElements > orders.length

  return (
    <RequireAuth roles={['customer']}>
      {/* ── Welcome bar ────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-2xl font-bold text-ironman-navy sm:text-3xl">
            {greetingName ? `Hi, ${greetingName}` : 'Welcome back'}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {lastUpdated ? (
              <>
                Updated <time dateTime={lastUpdated.toISOString()}>{formatClock(lastUpdated)}</time>
              </>
            ) : (
              'Loading your orders…'
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            aria-label="Refresh dashboard"
            className="focus-ring inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-ironman-navy-100 bg-white px-3 text-sm font-semibold text-ironman-navy transition-colors hover:bg-ironman-navy-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} aria-hidden />
            {refreshing ? 'Refreshing' : 'Refresh'}
          </button>
          <Link
            href="/customer/orders/new"
            className="focus-ring tap-target inline-flex items-center justify-center gap-2 rounded-lg bg-ironman-red px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ironman-red-dark"
          >
            <PackagePlus className="h-4 w-4" aria-hidden />
            New order
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <TableSkeleton rows={1} />
          <TableSkeleton rows={3} />
          <TableSkeleton rows={5} />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={handleRetry} />
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ironman-navy-100 bg-white p-10 text-center shadow-soft">
          <Inbox className="mx-auto h-10 w-10 text-ironman-navy/50" aria-hidden />
          <h3 className="mt-3 text-lg font-bold text-ironman-navy">No orders yet</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-gray-600">
            Place your first order and watch it travel from your doorstep, through our facility, and back to you —
            tracked end-to-end.
          </p>
          <Link
            href="/customer/orders/new"
            className="focus-ring tap-target mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-ironman-red px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ironman-red-dark"
          >
            <PackagePlus className="h-4 w-4" aria-hidden />
            Place an order
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Payment-due banner (above-fold; severity-aware, returns null when nothing is due) */}
          <PaymentDueBanner summary={dueSummary} />

          {/* ── Active order hero (or "nothing in flight" hint) ─────────── */}
          {activeOrder ? (
            <ActiveOrderCard order={activeOrder} dueAmount={activeOrderDue} />
          ) : (
            <div className="rounded-xl border border-dashed border-ironman-navy-100 bg-white p-5 text-center shadow-soft">
              <p className="text-sm font-semibold text-ironman-navy">No orders in flight right now</p>
              <p className="mt-1 text-xs text-gray-500">Ready for fresh laundry? Schedule a pickup in seconds.</p>
              <Link
                href="/customer/orders/new"
                className="focus-ring tap-target mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-ironman-red px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ironman-red-dark"
              >
                <PackagePlus className="h-4 w-4" aria-hidden />
                Place an order
              </Link>
            </div>
          )}

          {/* ── KPI row ─────────────────────────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              label="Active orders"
              value={String(activeOrders.length)}
              icon="PackageCheck"
              tone="red"
              hint={
                activeBreakdown.inProduction || activeBreakdown.onTheWay
                  ? `${activeBreakdown.inProduction} in production · ${activeBreakdown.onTheWay} on the way`
                  : 'Pickups + production + delivery'
              }
            />
            <MetricCard
              label="Awaiting payment"
              value={formatBdt(totalDue)}
              icon="WalletCards"
              hint={totalDue > 0 ? 'Tap an order to settle' : 'You’re all paid up'}
              tone={totalDue > 0 ? 'red' : 'plain'}
            />
            <MetricCard
              label="Delivered"
              value={String(deliveredOrders.length)}
              icon="Check"
              tone="navy"
              hint={capped ? `Across last ${orders.length} orders` : 'Across your history'}
            />
          </div>

          {/* ── Quick actions ───────────────────────────────────────────── */}
          <section aria-labelledby="quick-actions-heading">
            <SectionHeader title="Quick actions" description="Get things done in one tap" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <QuickAction
                href="/customer/orders/new"
                label="Place new order"
                hint="Schedule a pickup"
                Icon={PackagePlus}
                accent
              />
              <QuickAction
                href="/customer/orders"
                label="My orders"
                hint="History & receipts"
                Icon={ListChecks}
              />
              <QuickAction
                href="/customer/profile"
                label="Profile & addresses"
                hint="Update your details"
                Icon={UserRound}
              />
              <QuickAction
                href="/track"
                label="Quick track"
                hint="Track by order number"
                Icon={MapPin}
              />
            </div>
          </section>

          {/* ── Recent orders ───────────────────────────────────────────── */}
          <section aria-labelledby="recent-heading">
            <SectionHeader
              title="Recent orders"
              description={
                capped && totalElements !== null
                  ? `Showing ${Math.min(RECENT_COUNT, recentOrders.length)} of ${totalElements.toLocaleString()}`
                  : `Showing ${recentOrders.length} of ${orders.length.toLocaleString()}`
              }
              action={
                <Link
                  href="/customer/orders"
                  className="focus-ring inline-flex items-center gap-1 text-sm font-semibold text-ironman-red"
                >
                  All orders
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              }
            />
            {/* Mobile: card list (thumb-friendly). Desktop: existing table. */}
            <div className="md:hidden">
              <RecentOrdersCardList orders={recentOrders} baseHref="/customer/orders" />
            </div>
            <div className="hidden md:block">
              <OrderTable orders={recentSummaries} />
            </div>
          </section>

          {/* ── Help footer ─────────────────────────────────────────────── */}
          <section aria-label="Need help?" className="rounded-xl border border-ironman-navy-100 bg-ironman-navy-50/60 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white text-ironman-navy">
                  <HelpCircle className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ironman-navy">Need a hand?</p>
                  <p className="mt-0.5 text-xs text-gray-600">
                    Have a question about an order or want to flag a problem? Open the order and use the issues panel.
                  </p>
                </div>
              </div>
              <Link
                href="/customer/orders"
                className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-ironman-navy/20 bg-white px-3 py-2 text-sm font-semibold text-ironman-navy transition-colors hover:bg-white/90"
              >
                Open orders
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </section>

          {/* Live region for screen readers */}
          <div className="sr-only" aria-live="polite" role="status">
            {refreshing
              ? 'Refreshing your orders'
              : lastUpdated
                ? `Dashboard updated at ${formatClock(lastUpdated)}`
                : ''}
          </div>
        </div>
      )}
    </RequireAuth>
  )
}

// ─── Quick action tile ──────────────────────────────────────────────────────

function QuickAction({
  href,
  label,
  hint,
  Icon,
  accent
}: {
  href: string
  label: string
  hint: string
  Icon: typeof PackagePlus
  accent?: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'focus-ring group flex items-center gap-3 rounded-xl border bg-white p-4 shadow-soft transition-colors',
        accent
          ? 'border-ironman-red/30 hover:border-ironman-red hover:bg-ironman-red-50/30'
          : 'border-ironman-navy-100 hover:border-ironman-navy/30 hover:bg-ironman-navy-50/40'
      )}
    >
      <span
        className={cn(
          'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
          accent ? 'bg-ironman-red text-white' : 'bg-ironman-navy-50 text-ironman-navy'
        )}
        aria-hidden
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ironman-navy">{label}</p>
        <p className="truncate text-xs text-gray-500">{hint}</p>
      </div>
      <ArrowRight
        className={cn(
          'h-4 w-4 flex-shrink-0 transition-transform group-hover:translate-x-1',
          accent ? 'text-ironman-red' : 'text-gray-400'
        )}
        aria-hidden
      />
    </Link>
  )
}
