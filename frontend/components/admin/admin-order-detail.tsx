'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RequireAuth } from '@/components/auth/require-auth'
import { PaymentLedger } from '@/components/payments/payment-ledger'
import { LiveLocationPanel } from '@/components/tracking/live-location-panel'
import { DetailSkeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { TrackingTimeline } from '@/components/ui/tracking-timeline'
import { apiFetch, ApiError } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { useOrderLiveLocation } from '@/lib/use-live-location'
import { formatBdt, statusLabel } from '@/lib/utils'
import type {
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
// dropdown honest — admin can still force odd jumps, but only through real
// transitions that the backend will accept.
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

// Statuses that genuinely close or fork the order — require a reason from the
// admin so the audit trail isn't ambiguous later.
const REASON_REQUIRED: Set<OrderStatus> = new Set([
  'cancelled',
  'returned',
  'delivery_failed',
  'disputed'
])

// Which staff role can take each assignment type.
const TYPE_TO_ROLES: Record<AssignmentType, UserRole[]> = {
  pickup: ['delivery_man'],
  delivery: ['delivery_man'],
  wash: ['wash_man'],
  iron: ['iron_man'],
  dry_clean: ['dry_clean_man']
}

const ASSIGNMENT_TYPES: AssignmentType[] = ['pickup', 'delivery', 'wash', 'iron', 'dry_clean']

export function AdminOrderDetail({ id }: AdminOrderDetailProps) {
  const token = useAuthStore((state) => state.accessToken)
  const [order, setOrder] = useState<OrderResponse | null>(null)
  const [tracking, setTracking] = useState<TrackingEvent[]>([])
  const [payments, setPayments] = useState<PaymentLedgerRow[]>([])
  const [staff, setStaff] = useState<UserSummary[]>([])
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
    const [nextOrder, nextTracking, nextPayments, nextStaff] = await Promise.all([
      apiFetch<OrderResponse>(`/orders/${id}`, { token }),
      apiFetch<TrackingEvent[]>(`/orders/${id}/tracking`, { token }),
      apiFetch<PaymentLedgerRow[]>(`/payments/orders/${id}`, { token }),
      apiFetch<UserSummary[]>('/admin/staff', { token })
    ])
    setOrder(nextOrder)
    setTracking(nextTracking)
    setPayments(nextPayments)
    setStaff(nextStaff)
  }

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : 'Could not load order'))
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
    window.setTimeout(() => setMessage((c) => (c === text ? null : c)), 3500)
  }

  // Staff list filtered by the currently selected assignment type so admin
  // can't accidentally tell a wash_man to do a pickup.
  const eligibleStaff = useMemo(() => {
    if (!assignmentType) return [] as UserSummary[]
    const allowed = new Set<UserRole>(TYPE_TO_ROLES[assignmentType])
    return staff.filter((person) => person.active && allowed.has(person.role))
  }, [staff, assignmentType])

  // When the type changes, clear any stale selection from the previous type.
  useEffect(() => {
    setAssignedTo('')
  }, [assignmentType])

  const allowedNextStatuses = useMemo(() => {
    if (!order) return [] as OrderStatus[]
    return TRANSITIONS[order.status] ?? []
  }, [order])

  async function confirmOrder() {
    if (!token || !order) return
    try {
      await apiFetch(`/admin/orders/${id}/status`, {
        method: 'PUT',
        token,
        body: { status: 'confirmed', reason: 'Confirmed by admin' }
      })
      flash('Order confirmed — you can now assign staff.')
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.message : 'Failed to confirm order.')
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
      {order ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <section className="space-y-6">
            <div className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-ironman-navy">{order.customer.fullName}</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {formatBdt(Number(order.totalAmount))} total, {formatBdt(Number(order.paidAmount))} paid · Order{' '}
                    <span className="font-semibold text-ironman-navy">{order.orderNumber}</span>
                  </p>
                </div>
                <StatusBadge status={order.status} />
              </div>
            </div>

            {order.status === 'pending' && (
              <button
                onClick={confirmOrder}
                className="w-full rounded-xl bg-emerald-600 py-4 font-bold text-white shadow-lg transition-all hover:bg-emerald-700 active:scale-95"
              >
                Confirm order & notify customer
              </button>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <form
                className={`rounded-lg border border-ironman-navy-100 bg-white p-4 shadow-soft ${order.status === 'pending' ? 'opacity-50 pointer-events-none' : ''}`}
                onSubmit={assign}
              >
                <h3 className="text-lg font-bold text-ironman-navy">Assign staff</h3>
                <p className="text-xs text-gray-500">
                  Pick a job type first — the staff dropdown is filtered to the right role.
                </p>

                <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Assignment type
                  <select
                    value={assignmentType}
                    onChange={(event) => setAssignmentType(event.target.value as AssignmentType | '')}
                    className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
                    required
                  >
                    <option value="">Select type</option>
                    {ASSIGNMENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {statusLabel(type)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Staff member
                  <select
                    value={assignedTo}
                    onChange={(event) => setAssignedTo(event.target.value)}
                    className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring disabled:opacity-60"
                    required
                    disabled={!assignmentType}
                  >
                    <option value="">
                      {assignmentType
                        ? eligibleStaff.length === 0
                          ? 'No staff for this role'
                          : 'Select staff'
                        : 'Pick a type first'}
                    </option>
                    {eligibleStaff.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.fullName} · {statusLabel(person.role)}
                      </option>
                    ))}
                  </select>
                </label>

                <input
                  value={assignmentNotes}
                  onChange={(event) => setAssignmentNotes(event.target.value)}
                  className="tap-target mt-3 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
                  placeholder="Notes (optional)"
                />

                <button
                  className="tap-target mt-3 w-full rounded-lg bg-ironman-red px-4 py-2 font-semibold text-white disabled:opacity-60"
                  type="submit"
                  disabled={!assignmentType || !assignedTo}
                >
                  Assign
                </button>
              </form>

              <form className="rounded-lg border border-ironman-navy-100 bg-white p-4 shadow-soft" onSubmit={updateStatus}>
                <h3 className="text-lg font-bold text-ironman-navy">Update status</h3>
                <p className="text-xs text-gray-500">
                  Only valid next steps from <strong>{statusLabel(order.status)}</strong> are shown.
                </p>

                <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  New status
                  <select
                    value={overrideStatus}
                    onChange={(event) => setOverrideStatus(event.target.value as OrderStatus | '')}
                    className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
                    required
                    disabled={allowedNextStatuses.length === 0}
                  >
                    <option value="">
                      {allowedNextStatuses.length === 0 ? 'No further transitions available' : 'Select new status'}
                    </option>
                    {allowedNextStatuses.map((s) => (
                      <option key={s} value={s}>
                        {statusLabel(s)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Reason{overrideStatus && REASON_REQUIRED.has(overrideStatus) ? ' (required)' : ' (optional)'}
                  <textarea
                    value={overrideReason}
                    onChange={(event) => setOverrideReason(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 text-sm focus-ring"
                    rows={2}
                    placeholder="e.g. customer requested cancellation"
                  />
                </label>

                <button
                  className="tap-target mt-3 w-full rounded-lg bg-ironman-navy px-4 py-2 font-semibold text-white disabled:opacity-60"
                  type="submit"
                  disabled={!overrideStatus}
                >
                  Update
                </button>
              </form>
            </div>

            <PaymentLedger payments={payments} onVerify={verifyPayment} />
          </section>

          <section className="space-y-6">
            <LiveLocationPanel
              title="Delivery location"
              location={liveLocation.location}
              path={liveLocation.path}
              state={liveLocation.state}
              error={liveLocation.error}
            />
            <div className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
              <TrackingTimeline events={tracking} />
            </div>
          </section>
        </div>
      ) : (
        <DetailSkeleton />
      )}
    </RequireAuth>
  )
}
