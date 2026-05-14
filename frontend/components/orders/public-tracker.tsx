'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { apiFetch, endpoints } from '@/lib/api'
import { getSupabaseClient } from '@/lib/supabase'
import { TrackingTimeline } from '@/components/ui/tracking-timeline'
import type { TrackingEvent } from '@/types'

// Shape of an order_tracking row as delivered by Supabase realtime (snake_case).
type OrderTrackingRow = {
  id: string
  order_id: string
  status: string
  status_label: string
  description: string | null
  updated_by: string | null
  location_lat: number | null
  location_lng: number | null
  timestamp: string
}

export function PublicTracker() {
  const [orderNumber, setOrderNumber] = useState('')
  const [events, setEvents] = useState<TrackingEvent[]>([])
  const [orderId, setOrderId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function search() {
    const trimmed = orderNumber.trim()
    if (!trimmed) {
      setError('Enter an order number to track.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const nextEvents = await apiFetch<TrackingEvent[]>(endpoints.tracking(trimmed))
      setEvents(nextEvents)
      setOrderId(nextEvents[0]?.orderId ?? null)
    } catch (err) {
      setEvents([])
      setOrderId(null)
      setError(err instanceof Error ? err.message : 'Tracking not found')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const supabase = getSupabaseClient()
    if (!supabase || !orderId) {
      return
    }

    const channel = supabase
      .channel(`order-tracking-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_tracking',
          filter: `order_id=eq.${orderId}`
        },
        (payload) => {
          const row = payload.new as OrderTrackingRow
          setEvents((current) => {
            if (current.some((event) => event.id === row.id)) return current
            return [
              ...current,
              {
                id: row.id,
                orderId: row.order_id,
                status: row.status as TrackingEvent['status'],
                statusLabel: row.status_label,
                description: row.description ?? '',
                updatedBy: row.updated_by,
                updatedByName: 'Live update',
                locationLat: row.location_lat,
                locationLng: row.location_lng,
                timestamp: row.timestamp
              }
            ]
          })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [orderId])

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <section className="h-fit rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
        <h1 className="text-2xl font-bold text-ironman-navy">Track Order</h1>
        <label className="mt-5 block">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Order number</span>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              void search()
            }}
          >
            <input
              value={orderNumber}
              onChange={(event) => setOrderNumber(event.target.value)}
              className="tap-target min-w-0 flex-1 rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
              placeholder="IRM-20240501-0042"
            />
            <button className="tap-target focus-ring inline-flex items-center justify-center rounded-lg bg-ironman-red px-4 text-white disabled:opacity-70" type="submit" aria-label="Search order" disabled={loading}>
              <Search className="h-5 w-5" aria-hidden />
            </button>
          </form>
        </label>
        {error ? <p className="mt-4 rounded-lg bg-ironman-red-50 px-3 py-2 text-sm font-semibold text-ironman-red">{error}</p> : null}
        {orderNumber ? (
          <p className="mt-4 rounded-lg bg-ironman-navy-50 px-3 py-2 text-sm font-semibold text-ironman-navy">
            Searching: {orderNumber}
          </p>
        ) : (
          <p className="mt-4 text-xs text-gray-500">
            Your order number looks like <span className="font-mono">IRM-YYYYMMDD-NNNN</span>.
          </p>
        )}
      </section>
      <section className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
        {events.length ? <TrackingTimeline events={events} /> : <p className="text-sm font-semibold text-ironman-navy">Enter an order number to load the live timeline.</p>}
      </section>
    </div>
  )
}
