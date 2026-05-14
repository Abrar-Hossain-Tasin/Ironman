'use client'

import { useState } from 'react'
import { CalendarClock, Loader2 } from 'lucide-react'
import { apiFetch, ApiError } from '@/lib/api'
import { isoDate } from '@/lib/utils'
import type { OrderResponse, OrderStatus } from '@/types'

const reschedulableStatuses: OrderStatus[] = [
  'pending',
  'confirmed',
  'pickup_assigned'
]

const slots = ['10:00-12:00', '14:00-18:00', '18:00-20:00']

type OrderReschedulePanelProps = {
  order: OrderResponse
  token: string | null
  onRescheduled: (next: OrderResponse) => void
}

export function OrderReschedulePanel({ order, token, onRescheduled }: OrderReschedulePanelProps) {
  const editable = reschedulableStatuses.includes(order.status)
  const [open, setOpen] = useState(false)
  const [pickupDate, setPickupDate] = useState(order.preferredPickupDate)
  const [pickupSlot, setPickupSlot] = useState(order.preferredPickupTimeSlot)
  const [deliveryDate, setDeliveryDate] = useState(order.preferredDeliveryDate)
  const [deliverySlot, setDeliverySlot] = useState(order.preferredDeliveryTimeSlot)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function submit() {
    if (!token) return
    if (!pickupDate || !pickupSlot || !deliveryDate || !deliverySlot) {
      setError('All four date/slot fields are required')
      return
    }
    if (pickupDate < isoDate(0)) {
      setError('Pickup date cannot be in the past')
      return
    }
    if (deliveryDate < pickupDate) {
      setError('Delivery date cannot be before pickup date')
      return
    }
    setSubmitting(true)
    setError(null)
    setMessage(null)
    try {
      const next = await apiFetch<OrderResponse>(`/orders/${order.id}/reschedule`, {
        method: 'PATCH',
        token,
        body: {
          preferredPickupDate: pickupDate,
          preferredPickupTimeSlot: pickupSlot,
          preferredDeliveryDate: deliveryDate,
          preferredDeliveryTimeSlot: deliverySlot,
          reason: reason.trim() || null
        }
      })
      onRescheduled(next)
      setMessage('Reschedule request saved.')
      setOpen(false)
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail || err.message : err instanceof Error ? err.message : 'Could not reschedule'
      setError(msg || 'Could not reschedule')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-ironman-navy">
            <CalendarClock className="h-5 w-5 text-ironman-red" aria-hidden />
            Schedule
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Pickup <strong>{order.preferredPickupDate}</strong> · {order.preferredPickupTimeSlot}
            <br />
            Delivery <strong>{order.preferredDeliveryDate}</strong> · {order.preferredDeliveryTimeSlot}
          </p>
        </div>
        {editable ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="tap-target focus-ring rounded-lg border border-ironman-navy-100 px-3 py-2 text-sm font-semibold text-ironman-navy"
          >
            {open ? 'Cancel' : 'Reschedule'}
          </button>
        ) : (
          <span className="rounded-full bg-ironman-navy-50 px-3 py-1 text-xs font-semibold text-gray-500">
            Locked
          </span>
        )}
      </div>

      {!editable ? (
        <p className="mt-3 text-xs text-gray-500">
          Reschedule is available until the order is picked up. After pickup, please reach out to support.
        </p>
      ) : null}

      {message ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}

      {open ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label>
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">New pickup date</span>
            <input className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring" type="date" min={isoDate(0)} value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
          </label>
          <label>
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Pickup slot</span>
            <select className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring" value={pickupSlot} onChange={(e) => setPickupSlot(e.target.value)}>
              {slots.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label>
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">New delivery date</span>
            <input className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring" type="date" min={pickupDate || isoDate(0)} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
          </label>
          <label>
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Delivery slot</span>
            <select className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring" value={deliverySlot} onChange={(e) => setDeliverySlot(e.target.value)}>
              {slots.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="md:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Reason (optional)</span>
            <textarea className="mt-1 min-h-20 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring" value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          {error ? <p className="md:col-span-2 rounded-lg bg-ironman-red-50 px-3 py-2 text-sm font-semibold text-ironman-red">{error}</p> : null}
          <div className="md:col-span-2 flex justify-end">
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="tap-target focus-ring inline-flex items-center gap-2 rounded-lg bg-ironman-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {submitting ? 'Saving…' : 'Save new schedule'}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
