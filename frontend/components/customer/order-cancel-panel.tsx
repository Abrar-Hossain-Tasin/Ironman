'use client'

import { useState } from 'react'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import { apiFetch, ApiError } from '@/lib/api'
import type { OrderResponse, OrderStatus } from '@/types'

const cancellableStatuses: OrderStatus[] = [
  'pending',
  'confirmed',
  'pickup_assigned'
]

type OrderCancelPanelProps = {
  order: OrderResponse
  token: string | null
  onCancelled: () => void
}

export function OrderCancelPanel({ order, token, onCancelled }: OrderCancelPanelProps) {
  const cancellable = cancellableStatuses.includes(order.status)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (order.status === 'cancelled') {
    return (
      <section className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
        <div className="flex items-center gap-2 text-ironman-navy">
          <X className="h-5 w-5 text-ironman-red" aria-hidden />
          <h2 className="text-lg font-bold">Order cancelled</h2>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          This order is no longer active. If you paid an advance, any eligible refund will appear in the Refunds panel below.
        </p>
      </section>
    )
  }

  if (!cancellable) return null

  async function cancel() {
    if (!token) return
    setSubmitting(true)
    setError(null)
    try {
      await apiFetch(`/orders/${order.id}/cancel`, { method: 'PUT', token })
      onCancelled()
      setOpen(false)
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail || err.message : err instanceof Error ? err.message : 'Could not cancel order'
      setError(msg || 'Could not cancel order')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="rounded-lg border border-ironman-red-100 bg-ironman-red-50 p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-ironman-navy">
            <AlertTriangle className="h-5 w-5 text-ironman-red" aria-hidden />
            Cancel order
          </h2>
          <p className="mt-1 max-w-xl text-sm text-gray-700">
            Free cancellation before the delivery man arrives for pickup. After pickup, cancellation is not possible from
            self-service — please raise an issue instead. Any advance paid will be refunded to the original method within 3–5
            business days.
          </p>
        </div>
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="tap-target focus-ring rounded-lg border border-ironman-red bg-white px-3 py-2 text-sm font-semibold text-ironman-red"
          >
            Cancel this order
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="mt-3 rounded-lg border border-ironman-red bg-white p-4">
          <p className="text-sm font-semibold text-ironman-navy">Are you sure you want to cancel?</p>
          <p className="mt-1 text-sm text-gray-600">This cannot be undone from the app.</p>
          {error ? <p className="mt-3 rounded-lg bg-ironman-red-50 px-3 py-2 text-sm font-semibold text-ironman-red">{error}</p> : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={cancel}
              disabled={submitting}
              className="tap-target focus-ring inline-flex items-center gap-2 rounded-lg bg-ironman-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {submitting ? 'Cancelling…' : 'Yes, cancel order'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="tap-target focus-ring rounded-lg border border-ironman-navy-100 px-4 py-2 text-sm font-semibold text-ironman-navy"
            >
              Keep order
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
