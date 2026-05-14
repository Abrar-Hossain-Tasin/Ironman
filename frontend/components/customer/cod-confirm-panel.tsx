'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, HandCoins, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch, ApiError } from '@/lib/api'
import { getSupabaseClient } from '@/lib/supabase'
import type { CodPaymentStatusResponse, OrderResponse } from '@/types'

type CodConfirmPanelProps = {
  order: OrderResponse
  token: string | null
  onConfirmed: (status: CodPaymentStatusResponse) => void
}

const cashMethods = new Set(['cod', 'bkash', 'nagad', 'rocket'])

export function CodConfirmPanel({ order, token, onConfirmed }: CodConfirmPanelProps) {
  const [status, setStatus] = useState<CodPaymentStatusResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // Only relevant once the order is out for or past delivery.
  const relevantStatuses = new Set(['out_for_delivery', 'delivered'])
  const isCashLike = cashMethods.has(order.paymentMethod)
  const shouldShow = isCashLike && relevantStatuses.has(order.status)

  useEffect(() => {
    if (!token || !shouldShow) return
    const signal = { cancelled: false }

    async function fetchStatus() {
      try {
        const res = await apiFetch<CodPaymentStatusResponse>(`/orders/${order.id}/payment-status`, { token })
        if (!signal.cancelled) setStatus(res)
      } catch {
        // Silent: handshake is optional UI; payment ledger covers truth.
      }
    }

    void fetchStatus()

    // Realtime: re-fetch when the delivery agent confirms in their app so the
    // customer sees the "Delivery man confirmed" tick without refreshing.
    const client = getSupabaseClient()
    type Channel = ReturnType<NonNullable<typeof client>['channel']>
    let channel: Channel | null = null
    if (client) {
      channel = client
        .channel(`cod-customer-${order.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${order.id}` },
          () => void fetchStatus()
        )
        .subscribe()
    }

    return () => {
      signal.cancelled = true
      if (channel && client) {
        void client.removeChannel(channel)
      }
    }
  }, [token, order.id, shouldShow])

  useEffect(() => {
    if (message) toast.success(message)
  }, [message])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  if (!shouldShow) return null

  async function confirm() {
    if (!token) return
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const next = await apiFetch<CodPaymentStatusResponse>(`/orders/${order.id}/customer-payment-confirm`, {
        method: 'PATCH',
        token
      })
      setStatus(next)
      onConfirmed(next)
      setMessage('Thanks — payment confirmation logged.')
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail || err.message : err instanceof Error ? err.message : 'Could not confirm'
      setError(msg || 'Could not confirm payment')
    } finally {
      setLoading(false)
    }
  }

  const customerConfirmed = Boolean(status?.customerConfirmedAt || order.customerConfirmedAt)
  const deliveryConfirmed = Boolean(status?.deliveryConfirmedAt || order.deliveryConfirmedAt)

  return (
    <section className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
      <h2 className="flex items-center gap-2 text-lg font-bold text-ironman-navy">
        <HandCoins className="h-5 w-5 text-ironman-red" aria-hidden />
        Cash handover
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        Both sides confirm handover so the ledger matches what actually changed hands.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <HandshakeRow
          label="You confirmed"
          done={customerConfirmed}
          subtitle={customerConfirmed ? 'Logged on your account' : 'Tap once you hand over the cash.'}
        />
        <HandshakeRow
          label="Delivery man confirmed"
          done={deliveryConfirmed}
          subtitle={deliveryConfirmed ? 'Logged from delivery app' : 'Waiting on the delivery man.'}
        />
      </div>

      {!customerConfirmed ? (
        <button
          type="button"
          onClick={confirm}
          disabled={loading}
          className="tap-target focus-ring mt-4 inline-flex items-center gap-2 rounded-lg bg-ironman-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <CheckCircle2 className="h-4 w-4" aria-hidden />}
          {loading ? 'Confirming…' : "I've paid the delivery man"}
        </button>
      ) : null}
    </section>
  )
}

function HandshakeRow({ label, done, subtitle }: { label: string; done: boolean; subtitle: string }) {
  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 ${done ? 'border-emerald-200 bg-emerald-50' : 'border-ironman-navy-100 bg-ironman-navy-50'}`}>
      <span className={`mt-0.5 grid h-6 w-6 place-items-center rounded-full text-white ${done ? 'bg-emerald-500' : 'bg-gray-300'}`}>
        <CheckCircle2 className="h-4 w-4" aria-hidden />
      </span>
      <div>
        <p className="text-sm font-semibold text-ironman-navy">{label}</p>
        <p className="text-xs text-gray-600">{subtitle}</p>
      </div>
    </div>
  )
}
