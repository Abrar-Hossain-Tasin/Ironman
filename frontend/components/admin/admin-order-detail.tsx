'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Mail,
  MapPin,
  Package,
  Phone,
  ReceiptText,
  RefreshCw,
  Route,
  Shirt,
  Truck,
  UserPlus,
  UserRound,
  WalletCards
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { RequireAuth } from '@/components/auth/require-auth'
import { PaymentLedger } from '@/components/payments/payment-ledger'
import { LiveLocationPanel } from '@/components/tracking/live-location-panel'
import { DetailSkeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { TrackingTimeline } from '@/components/ui/tracking-timeline'
import { apiFetch, ApiError } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { lifecycle } from '@/lib/statuses'
import { useOrderLiveLocation } from '@/lib/use-live-location'
import { cn, formatBdt, statusLabel } from '@/lib/utils'
import type {
  AddressResponse,
  AssignmentType,
  OrderResponse,
  OrderStatus,
  PaymentLedgerRow,
  TrackingEvent,
  UserRole,
  UserSummary
} from '@/types'

type AdminOrderDetailProps = {
  id: string
}

const LIVE_LOCATION_STATUSES = new Set<OrderStatus>([
  'pickup_assigned',
  'delivery_assigned',
  'out_for_delivery'
])

// Allowed status transitions from each starting state. Keeps the override
// dropdown honest: admin can move fast, but only through backend-safe steps.
const TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['pickup_assigned', 'cancelled'],
  pickup_assigned: ['picked_up', 'cancelled'],
  picked_up: ['in_wash', 'in_dry_clean', 'cancelled'],
  in_wash: ['wash_complete', 'cancelled'],
  wash_complete: ['waiting_for_iron', 'in_dry_clean', 'ready', 'cancelled'],
  in_dry_clean: ['dry_clean_complete', 'cancelled'],
  dry_clean_complete: ['waiting_for_iron', 'ready', 'cancelled'],
  waiting_for_iron: ['in_iron', 'cancelled'],
  in_iron: ['iron_complete', 'cancelled'],
  iron_complete: ['ready', 'cancelled'],
  ready: ['delivery_assigned', 'cancelled'],
  delivery_assigned: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'delivery_failed', 'returned'],
  delivered: ['disputed', 'returned'],
  delivery_failed: ['delivery_assigned', 'returned', 'cancelled'],
  disputed: ['delivered', 'returned'],
  returned: [],
  cancelled: []
}

// These close or fork the order, so keep a clear audit note.
const REASON_REQUIRED: Set<OrderStatus> = new Set([
  'cancelled',
  'returned',
  'delivery_failed',
  'disputed'
])

const TYPE_TO_ROLES: Record<AssignmentType, UserRole[]> = {
  pickup: ['delivery_man'],
  delivery: ['delivery_man'],
  wash: ['wash_man'],
  iron: ['iron_man'],
  dry_clean: ['dry_clean_man']
}

const ASSIGNMENT_TYPES: AssignmentType[] = ['pickup', 'delivery', 'wash', 'iron', 'dry_clean']

const dateFormatter = new Intl.DateTimeFormat('en-BD', {
  dateStyle: 'medium',
  timeZone: 'Asia/Dhaka'
})

const dateTimeFormatter = new Intl.DateTimeFormat('en-BD', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Dhaka'
})

function formatDate(value: string) {
  return dateFormatter.format(new Date(`${value}T00:00:00+06:00`))
}

function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value))
}

function formatAddress(address: AddressResponse) {
  return [
    address.addressLine1,
    address.addressLine2,
    [address.area, address.city].filter(Boolean).join(', '),
    address.postalCode
  ]
    .filter(Boolean)
    .join(', ')
}

function safeNumber(value: number | string | null | undefined) {
  return Number(value ?? 0)
}

function completionPercent(status: OrderStatus) {
  const index = lifecycle.indexOf(status)
  if (index < 0) {
    return ['delivered', 'returned', 'cancelled', 'disputed'].includes(status) ? 100 : 0
  }
  return Math.round((index / (lifecycle.length - 1)) * 100)
}

function Panel({
  title,
  description,
  icon: Icon,
  children,
  className
}: {
  title: string
  description?: string
  icon: LucideIcon
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('min-w-0 rounded-lg border border-ironman-navy-100 bg-white shadow-soft', className)}>
      <div className="flex items-start gap-3 border-b border-ironman-navy-100 px-4 py-4 sm:px-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ironman-navy-50 text-ironman-navy">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h3 className="font-body text-sm font-bold uppercase tracking-wide text-ironman-navy">{title}</h3>
          {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
        </div>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'navy'
}: {
  label: string
  value: string
  detail?: string
  icon: LucideIcon
  tone?: 'navy' | 'red' | 'green' | 'amber'
}) {
  const toneClass = {
    navy: 'bg-ironman-navy text-white',
    red: 'bg-ironman-red text-white',
    green: 'bg-emerald-600 text-white',
    amber: 'bg-amber-500 text-white'
  }[tone]

  return (
    <div className="rounded-lg border border-ironman-navy-100 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-2 font-body text-2xl font-bold text-ironman-navy">{value}</p>
          {detail ? <p className="mt-1 text-xs text-gray-500">{detail}</p> : null}
        </div>
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', toneClass)}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ironman-navy-100 py-3 last:border-b-0">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="max-w-[65%] text-right text-sm font-semibold text-ironman-navy">{value}</dd>
    </div>
  )
}

function AddressBlock({ title, address }: { title: string; address: AddressResponse }) {
  return (
    <div className="rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-ironman-red">{title}</p>
      <p className="mt-2 text-sm font-semibold text-ironman-navy">{address.label || 'Address'}</p>
      <p className="mt-1 text-sm leading-6 text-gray-600">{formatAddress(address)}</p>
      {address.latitude && address.longitude ? (
        <p className="mt-2 font-mono text-xs text-gray-500">
          {address.latitude.toFixed(5)}, {address.longitude.toFixed(5)}
        </p>
      ) : null}
    </div>
  )
}

export function AdminOrderDetail({ id }: AdminOrderDetailProps) {
  const token = useAuthStore((state) => state.accessToken)
  const [order, setOrder] = useState<OrderResponse | null>(null)
  const [tracking, setTracking] = useState<TrackingEvent[]>([])
  const [payments, setPayments] = useState<PaymentLedgerRow[]>([])
  const [staff, setStaff] = useState<UserSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [assignmentType, setAssignmentType] = useState<AssignmentType | ''>('')
  const [assignedTo, setAssignedTo] = useState('')
  const [assignmentNotes, setAssignmentNotes] = useState('')
  const [overrideStatus, setOverrideStatus] = useState<OrderStatus | ''>('')
  const [overrideReason, setOverrideReason] = useState('')

  const liveLocation = useOrderLiveLocation(
    order?.id,
    token,
    Boolean(order && LIVE_LOCATION_STATUSES.has(order.status))
  )

  async function load() {
    if (!token) return
    setError(null)

    const [nextOrder, nextTracking, nextPayments, nextStaff] = await Promise.allSettled([
      apiFetch<OrderResponse>(`/orders/${id}`, { token }),
      apiFetch<TrackingEvent[]>(`/orders/${id}/tracking`, { token }),
      apiFetch<PaymentLedgerRow[]>(`/payments/orders/${id}`, { token }),
      apiFetch<UserSummary[]>('/admin/staff', { token })
    ])

    if (nextOrder.status === 'rejected') {
      throw nextOrder.reason
    }

    setOrder(nextOrder.value)
    setTracking(nextTracking.status === 'fulfilled' ? nextTracking.value : [])
    setPayments(nextPayments.status === 'fulfilled' ? nextPayments.value : [])
    setStaff(nextStaff.status === 'fulfilled' ? nextStaff.value : [])

    const partialFailures = [
      nextTracking.status === 'rejected' ? 'tracking' : null,
      nextPayments.status === 'rejected' ? 'payments' : null,
      nextStaff.status === 'rejected' ? 'staff' : null
    ].filter(Boolean)

    if (partialFailures.length > 0) {
      setError(`Order loaded, but ${partialFailures.join(', ')} could not be refreshed.`)
    }
  }

  useEffect(() => {
    setLoading(true)
    void load()
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load order'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token])

  useEffect(() => {
    if (message) toast.success(message)
  }, [message])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  function flash(text: string) {
    setMessage(text)
    setError(null)
    window.setTimeout(() => setMessage((current) => (current === text ? null : current)), 3500)
  }

  const eligibleStaff = useMemo(() => {
    if (!assignmentType) return [] as UserSummary[]
    const allowed = new Set<UserRole>(TYPE_TO_ROLES[assignmentType])
    return staff.filter((person) => person.active && allowed.has(person.role))
  }, [staff, assignmentType])

  useEffect(() => {
    setAssignedTo('')
  }, [assignmentType])

  const allowedNextStatuses = useMemo(() => {
    if (!order) return [] as OrderStatus[]
    return TRANSITIONS[order.status] ?? []
  }, [order])

  const orderStats = useMemo(() => {
    if (!order) {
      return {
        itemCount: 0,
        total: 0,
        paid: 0,
        discount: 0,
        due: 0,
        paymentCompletion: 0,
        progress: 0
      }
    }

    const total = safeNumber(order.totalAmount)
    const paid = safeNumber(order.paidAmount)
    const discount = safeNumber(order.discountAmount)
    const due = Math.max(total - paid, 0)
    const itemCount = order.items.reduce((sum, item) => sum + safeNumber(item.actualQuantity ?? item.quantity), 0)
    const paymentCompletion = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 100

    return {
      itemCount,
      total,
      paid,
      discount,
      due,
      paymentCompletion,
      progress: completionPercent(order.status)
    }
  }, [order])

  async function confirmOrder() {
    if (!token || !order) return
    setConfirming(true)
    try {
      await apiFetch(`/admin/orders/${id}/status`, {
        method: 'PUT',
        token,
        body: { status: 'confirmed', reason: 'Confirmed by admin' }
      })
      flash('Order confirmed. You can now assign staff.')
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.message : 'Failed to confirm order.')
    } finally {
      setConfirming(false)
    }
  }

  async function updateStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token || !overrideStatus) {
      setError('Pick a new status to transition to.')
      return
    }
    if (REASON_REQUIRED.has(overrideStatus) && !overrideReason.trim()) {
      setError(`A reason is required when moving an order to ${statusLabel(overrideStatus)}.`)
      return
    }
    try {
      await apiFetch(`/admin/orders/${id}/status`, {
        method: 'PUT',
        token,
        body: { status: overrideStatus, reason: overrideReason.trim() || null }
      })
      flash(`Status set to ${statusLabel(overrideStatus)}`)
      setOverrideStatus('')
      setOverrideReason('')
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.message : err instanceof Error ? err.message : 'Could not update status')
    }
  }

  async function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return
    if (!assignmentType || !assignedTo) {
      setError('Pick both an assignment type and a staff member.')
      return
    }
    try {
      await apiFetch(`/admin/orders/${id}/assign`, {
        method: 'POST',
        token,
        body: {
          assignedTo,
          assignmentType,
          notes: assignmentNotes.trim() || null
        }
      })
      flash('Assignment created')
      setAssignmentType('')
      setAssignedTo('')
      setAssignmentNotes('')
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.message : err instanceof Error ? err.message : 'Could not assign staff')
    }
  }

  async function verifyPayment(payment: PaymentLedgerRow) {
    if (!token) return
    try {
      await apiFetch<PaymentLedgerRow>(`/payments/${payment.id}/verify`, { method: 'PUT', token })
      flash('Payment verified')
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.message : err instanceof Error ? err.message : 'Could not verify payment')
    }
  }

  return (
    <RequireAuth roles={['admin']}>
      {loading ? (
        <DetailSkeleton />
      ) : order ? (
        <div className="space-y-6">
          <div className="rounded-lg border border-ironman-navy-100 bg-white shadow-soft">
            <div className="grid gap-5 p-4 sm:p-6 xl:grid-cols-[1fr_360px]">
              <div>
                <Link
                  href="/admin/orders"
                  className="focus-ring inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-ironman-navy hover:bg-ironman-navy-50"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Orders
                </Link>

                <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="font-body text-3xl font-bold text-ironman-navy">{order.orderNumber}</h2>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                      {order.customer.fullName} placed this order on {formatDateTime(order.createdAt)}. Keep assignment,
                      payment, and delivery movement in sync from this screen.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void load().catch((err) =>
                        setError(err instanceof Error ? err.message : 'Could not refresh order')
                      )
                    }}
                    className="tap-target focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 text-sm font-semibold text-ironman-navy hover:bg-ironman-navy-50"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden />
                    Refresh
                  </button>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <span>Lifecycle progress</span>
                    <span>{orderStats.progress}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-ironman-navy-50">
                    <div
                      className="h-full rounded-full bg-ironman-red transition-all duration-500"
                      style={{ width: `${orderStats.progress}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-ironman-navy p-5 text-white">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Balance due</p>
                    <p className="mt-2 font-body text-3xl font-bold">{formatBdt(orderStats.due)}</p>
                  </div>
                  <WalletCards className="h-8 w-8 text-white/70" aria-hidden />
                </div>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                    style={{ width: `${orderStats.paymentCompletion}%` }}
                  />
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 text-sm text-white/75">
                  <span>{formatBdt(orderStats.paid)} paid</span>
                  <StatusBadge status={order.paymentStatus} className="bg-white/10" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Order total" value={formatBdt(orderStats.total)} detail="Quoted customer amount" icon={ReceiptText} />
            <MetricCard label="Collected" value={formatBdt(orderStats.paid)} detail={`${orderStats.paymentCompletion}% of balance`} icon={CreditCard} tone="green" />
            <MetricCard label="Items" value={String(orderStats.itemCount)} detail={`${order.items.length} service line${order.items.length === 1 ? '' : 's'}`} icon={Package} tone="amber" />
            <MetricCard label="Discount" value={formatBdt(orderStats.discount)} detail={order.couponCode ? `Coupon ${order.couponCode}` : 'No coupon applied'} icon={WalletCards} tone="red" />
          </div>

          {order.status === 'pending' ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 shadow-soft sm:flex sm:items-center sm:justify-between sm:gap-4">
              <div>
                <p className="font-body text-lg font-bold text-emerald-900">Order is waiting for admin confirmation</p>
                <p className="mt-1 text-sm text-emerald-800">
                  Confirming the order unlocks staff assignment and notifies the customer.
                </p>
              </div>
              <button
                type="button"
                onClick={confirmOrder}
                disabled={confirming}
                className="tap-target focus-ring mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white shadow-lg transition hover:bg-emerald-700 disabled:opacity-60 sm:mt-0 sm:w-auto"
              >
                <CheckCircle2 className="h-5 w-5" aria-hidden />
                {confirming ? 'Confirming...' : 'Confirm order'}
              </button>
            </div>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <section className="min-w-0 space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Panel
                  title="Assign staff"
                  description="Select the work type first. Staff choices are filtered by role."
                  icon={UserPlus}
                  className={order.status === 'pending' ? 'opacity-70' : undefined}
                >
                  {order.status === 'pending' ? (
                    <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                      Confirm this order before assigning staff.
                    </p>
                  ) : null}
                  <form className="space-y-3" onSubmit={assign}>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Assignment type
                      <select
                        value={assignmentType}
                        onChange={(event) => setAssignmentType(event.target.value as AssignmentType | '')}
                        className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 text-sm text-ironman-navy focus-ring"
                        required
                        disabled={order.status === 'pending'}
                      >
                        <option value="">Select type</option>
                        {ASSIGNMENT_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {statusLabel(type)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Staff member
                      <select
                        value={assignedTo}
                        onChange={(event) => setAssignedTo(event.target.value)}
                        className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 text-sm text-ironman-navy focus-ring disabled:opacity-60"
                        required
                        disabled={!assignmentType || order.status === 'pending'}
                      >
                        <option value="">
                          {assignmentType
                            ? eligibleStaff.length === 0
                              ? 'No staff available for this role'
                              : 'Select staff'
                            : 'Pick a type first'}
                        </option>
                        {eligibleStaff.map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.fullName} - {statusLabel(person.role)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Notes
                      <input
                        value={assignmentNotes}
                        onChange={(event) => setAssignmentNotes(event.target.value)}
                        className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 text-sm text-ironman-navy focus-ring"
                        placeholder="Optional handoff note"
                        disabled={order.status === 'pending'}
                      />
                    </label>

                    <button
                      className="tap-target focus-ring inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ironman-red px-4 py-2.5 font-semibold text-white disabled:opacity-60"
                      type="submit"
                      disabled={order.status === 'pending' || !assignmentType || !assignedTo}
                    >
                      <Truck className="h-4 w-4" aria-hidden />
                      Assign staff
                    </button>
                  </form>
                </Panel>

                <Panel
                  title="Update status"
                  description={`Valid next steps from ${statusLabel(order.status)} are shown.`}
                  icon={Route}
                >
                  <form className="space-y-3" onSubmit={updateStatus}>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                      New status
                      <select
                        value={overrideStatus}
                        onChange={(event) => setOverrideStatus(event.target.value as OrderStatus | '')}
                        className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 text-sm text-ironman-navy focus-ring"
                        required
                        disabled={allowedNextStatuses.length === 0}
                      >
                        <option value="">
                          {allowedNextStatuses.length === 0 ? 'No further transitions available' : 'Select new status'}
                        </option>
                        {allowedNextStatuses.map((status) => (
                          <option key={status} value={status}>
                            {statusLabel(status)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Reason{overrideStatus && REASON_REQUIRED.has(overrideStatus) ? ' required' : ' optional'}
                      <textarea
                        value={overrideReason}
                        onChange={(event) => setOverrideReason(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 text-sm text-ironman-navy focus-ring"
                        rows={3}
                        placeholder="Customer requested cancellation, delivery failed, etc."
                      />
                    </label>

                    <button
                      className="tap-target focus-ring inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ironman-navy px-4 py-2.5 font-semibold text-white disabled:opacity-60"
                      type="submit"
                      disabled={!overrideStatus}
                    >
                      <RefreshCw className="h-4 w-4" aria-hidden />
                      Update status
                    </button>
                  </form>
                </Panel>
              </div>

              <Panel
                title="Order items"
                description="Quoted lines and reconciled quantities for processing."
                icon={Shirt}
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-sm">
                    <thead className="border-b border-ironman-navy-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="pb-3 pr-4">Garment</th>
                        <th className="pb-3 pr-4">Service</th>
                        <th className="pb-3 pr-4 text-right">Qty</th>
                        <th className="pb-3 pr-4 text-right">Actual</th>
                        <th className="pb-3 pr-4 text-right">Unit</th>
                        <th className="pb-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ironman-navy-100">
                      {order.items.map((item) => (
                        <tr key={item.id}>
                          <td className="py-4 pr-4 font-semibold text-ironman-navy">
                            {item.clothingTypeName}
                            {item.notes ? <span className="mt-1 block text-xs font-normal text-gray-500">{item.notes}</span> : null}
                          </td>
                          <td className="py-4 pr-4 text-gray-600">{item.serviceCategoryName}</td>
                          <td className="py-4 pr-4 text-right font-semibold text-ironman-navy">{item.quantity}</td>
                          <td className="py-4 pr-4 text-right font-semibold text-ironman-navy">
                            {item.actualQuantity ?? '-'}
                          </td>
                          <td className="py-4 pr-4 text-right text-gray-600">{formatBdt(safeNumber(item.unitPrice))}</td>
                          <td className="py-4 text-right font-semibold text-ironman-navy">
                            {formatBdt(safeNumber(item.subtotal))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>

              <Panel title="Payment ledger" description="Collections, verification, and settlement state." icon={CreditCard}>
                {payments.length > 0 ? (
                  <PaymentLedger payments={payments} onVerify={verifyPayment} />
                ) : (
                  <div className="rounded-lg border border-dashed border-ironman-navy-100 bg-ironman-navy-50 p-6 text-center">
                    <CreditCard className="mx-auto h-8 w-8 text-ironman-navy-200" aria-hidden />
                    <p className="mt-3 font-semibold text-ironman-navy">No payments recorded yet</p>
                    <p className="mt-1 text-sm text-gray-500">Collections will appear here after pickup, delivery, or online payment.</p>
                  </div>
                )}
              </Panel>
            </section>

            <aside className="min-w-0 space-y-6">
              <Panel title="Customer" description="Contact and order ownership." icon={UserRound}>
                <dl>
                  <DetailRow label="Name" value={order.customer.fullName} />
                  <DetailRow
                    label="Phone"
                    value={
                      <a className="inline-flex items-center justify-end gap-2 hover:text-ironman-red" href={`tel:${order.customer.phone}`}>
                        <Phone className="h-4 w-4" aria-hidden />
                        {order.customer.phone}
                      </a>
                    }
                  />
                  <DetailRow
                    label="Email"
                    value={
                      <a className="inline-flex items-center justify-end gap-2 break-all hover:text-ironman-red" href={`mailto:${order.customer.email}`}>
                        <Mail className="h-4 w-4 shrink-0" aria-hidden />
                        {order.customer.email}
                      </a>
                    }
                  />
                  <DetailRow label="Payment method" value={statusLabel(order.paymentMethod)} />
                  <DetailRow label="Payment status" value={<StatusBadge status={order.paymentStatus} />} />
                </dl>
              </Panel>

              <Panel title="Schedule" description="Pickup and delivery commitments." icon={CalendarClock}>
                <dl>
                  <DetailRow label="Pickup date" value={formatDate(order.preferredPickupDate)} />
                  <DetailRow label="Pickup slot" value={order.preferredPickupTimeSlot} />
                  <DetailRow label="Delivery date" value={formatDate(order.preferredDeliveryDate)} />
                  <DetailRow label="Delivery slot" value={order.preferredDeliveryTimeSlot} />
                  <DetailRow label="Updated" value={formatDateTime(order.updatedAt)} />
                </dl>
                {order.specialInstructions ? (
                  <div className="mt-4 rounded-lg bg-ironman-red-50 p-3 text-sm text-ironman-navy">
                    <p className="font-semibold">Special instructions</p>
                    <p className="mt-1 leading-6 text-gray-600">{order.specialInstructions}</p>
                  </div>
                ) : null}
              </Panel>

              <Panel title="Addresses" description="Customer pickup and drop-off points." icon={MapPin}>
                <div className="space-y-3">
                  <AddressBlock title="Pickup" address={order.pickupAddress} />
                  <AddressBlock title="Delivery" address={order.deliveryAddress} />
                </div>
              </Panel>

              <LiveLocationPanel
                title="Live delivery location"
                location={liveLocation.location}
                path={liveLocation.path}
                state={liveLocation.state}
                error={liveLocation.error}
              />

              <Panel title="Tracking timeline" description="Customer-visible lifecycle history." icon={Route}>
                <TrackingTimeline events={tracking} />
              </Panel>
            </aside>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-ironman-navy-100 bg-white p-8 text-center shadow-soft">
          <p className="text-base font-bold text-ironman-navy">Could not load this order</p>
          <p className="mt-1 text-sm text-gray-600">
            {error ?? 'The order may have been removed, or you may not have access to it.'}
          </p>
          <Link
            href="/admin/orders"
            className="tap-target focus-ring mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-ironman-navy px-4 py-2 text-sm font-semibold text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to orders
          </Link>
        </div>
      )}
    </RequireAuth>
  )
}
