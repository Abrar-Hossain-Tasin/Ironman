'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { RequireAuth } from '@/components/auth/require-auth'
import { CodConfirmPanel } from '@/components/customer/cod-confirm-panel'
import { OrderCancelPanel } from '@/components/customer/order-cancel-panel'
import { OrderIssuesPanel } from '@/components/customer/order-issues-panel'
import { OrderRefundsPanel } from '@/components/customer/order-refunds-panel'
import { OrderReschedulePanel } from '@/components/customer/order-reschedule-panel'
import { OrderReviewPanel } from '@/components/customer/order-review-panel'
import { ReceiptPanel } from '@/components/customer/receipt-panel'
import { OrderPaymentPanel } from '@/components/payments/order-payment-panel'
import { PaymentLedger } from '@/components/payments/payment-ledger'
import { LiveLocationPanel } from '@/components/tracking/live-location-panel'
import { DetailSkeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { TrackingTimeline } from '@/components/ui/tracking-timeline'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { useOrderLiveLocation } from '@/lib/use-live-location'
import { formatBdt } from '@/lib/utils'
import type { OrderResponse, OrderStatus, PaymentLedgerRow, TrackingEvent } from '@/types'

const LIVE_LOCATION_STATUSES = new Set<OrderStatus>([
  'pickup_assigned',
  'delivery_assigned',
  'out_for_delivery'
])

// Closed states never allow reschedule, cancel, or COD handshake.
const CLOSED_STATUSES = new Set<OrderStatus>(['delivered', 'cancelled', 'returned', 'disputed'])

// Reschedule is meaningful until pickup; after that pickup slot is locked,
// and the panel's own guardrails handle the delivery side.
const RESCHEDULE_STATUSES = new Set<OrderStatus>([
  'pending',
  'confirmed',
  'pickup_assigned',
  'picked_up',
  'in_wash',
  'wash_complete',
  'in_dry_clean',
  'dry_clean_complete',
  'waiting_for_iron',
  'in_iron',
  'iron_complete',
  'ready',
  'delivery_assigned',
  'out_for_delivery'
])

// Cancel is only allowed while the order hasn't been picked up yet.
const CANCEL_STATUSES = new Set<OrderStatus>(['pending', 'confirmed', 'pickup_assigned'])

type CustomerOrderDetailProps = {
  id: string
}

export function CustomerOrderDetail({ id }: CustomerOrderDetailProps) {
  const router = useRouter()
  const token = useAuthStore((state) => state.accessToken)
  const [order, setOrder] = useState<OrderResponse | null>(null)
  const [tracking, setTracking] = useState<TrackingEvent[]>([])
  const [payments, setPayments] = useState<PaymentLedgerRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const liveLocation = useOrderLiveLocation(
    order?.id,
    token,
    Boolean(order && LIVE_LOCATION_STATUSES.has(order.status))
  )

  async function load() {
    if (!token) return
    const [nextOrder, nextTracking, nextPayments] = await Promise.all([
      apiFetch<OrderResponse>(`/orders/${id}`, { token }),
      apiFetch<TrackingEvent[]>(`/orders/${id}/tracking`, { token }),
      apiFetch<PaymentLedgerRow[]>(`/orders/${id}/payments`, { token })
    ])
    setOrder(nextOrder)
    setTracking(nextTracking)
    setPayments(nextPayments)
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'Could not load order'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  function placeAgain() {
    if (!order) return
    router.push(`/customer/orders/new?reorder=${order.id}`)
  }

  const discount = order ? Number(order.discountAmount ?? 0) : 0
  const subtotalFromItems = order
    ? order.items.reduce((sum, item) => sum + Number(item.subtotal), 0)
    : 0

  const showReschedule = !!order && RESCHEDULE_STATUSES.has(order.status)
  const showCod = !!order && order.paymentMethod === 'cod' && !CLOSED_STATUSES.has(order.status)
  const balanceDue = order ? Math.max(0, Number(order.totalAmount) - Number(order.paidAmount)) : 0
  const showPayment = !!order && balanceDue > 0 && !CLOSED_STATUSES.has(order.status)
  const showReceipt =
    !!order && (Number(order.paidAmount) > 0 || order.status === 'delivered' || order.codConfirmationStatus === 'delivery_confirmed')
  const showReview = !!order && order.status === 'delivered'
  const showIssues = !!order && (order.status === 'delivered' || order.status === 'disputed' || order.status === 'returned')
  const showRefunds = !!order && (Number(order.paidAmount) > 0 || order.status === 'returned' || order.status === 'disputed')
  const showCancel = !!order && CANCEL_STATUSES.has(order.status)

  return (
    <RequireAuth roles={['customer']}>
      {order ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="space-y-6">
            <div className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Order</p>
                  <h2 className="text-xl font-bold text-ironman-navy">{order.orderNumber}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={placeAgain}
                    className="tap-target focus-ring inline-flex items-center gap-2 rounded-lg border border-ironman-navy-100 px-3 py-2 text-sm font-semibold text-ironman-navy hover:bg-ironman-navy-50"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden />
                    Place again
                  </button>
                  <StatusBadge status={order.status} />
                </div>
              </div>
              <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-500">Items</dt>
                  <dd className="mt-1 font-bold text-ironman-navy">
                    {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-500">Total</dt>
                  <dd className="mt-1 font-bold text-ironman-navy">{formatBdt(Number(order.totalAmount))}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-500">Paid</dt>
                  <dd className="mt-1 font-bold text-ironman-navy">{formatBdt(Number(order.paidAmount))}</dd>
                </div>
              </dl>
              {discount > 0 ? (
                <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Coupon {order.couponCode ?? ''} · −{formatBdt(discount)} off (subtotal {formatBdt(subtotalFromItems)})
                </p>
              ) : null}
            </div>

            {showReschedule ? (
              <OrderReschedulePanel order={order} token={token} onRescheduled={(next) => setOrder(next)} />
            ) : null}

            {showCod ? (
              <CodConfirmPanel
                order={order}
                token={token}
                onConfirmed={() => {
                  void load()
                }}
              />
            ) : null}

            {showPayment ? (
              <OrderPaymentPanel
                order={order}
                token={token}
                onPaymentRecorded={() => {
                  void load()
                }}
              />
            ) : null}
            {payments.length > 0 ? <PaymentLedger payments={payments} /> : null}

            {showReceipt ? <ReceiptPanel order={order} token={token} /> : null}
            {showReview ? <OrderReviewPanel order={order} token={token} /> : null}
            {showIssues ? <OrderIssuesPanel order={order} token={token} /> : null}
            {showRefunds ? <OrderRefundsPanel orderId={order.id} token={token} /> : null}
            {showCancel ? (
              <OrderCancelPanel
                order={order}
                token={token}
                onCancelled={() => {
                  void load()
                }}
              />
            ) : null}
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
