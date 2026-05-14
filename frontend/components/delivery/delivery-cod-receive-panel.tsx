'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, HandCoins, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { PanelSkeleton } from '@/components/ui/skeleton'
import { apiFetch, ApiError } from '@/lib/api'
import { getSupabaseClient } from '@/lib/supabase'
import type { Assignment, CodPaymentStatusResponse, PaymentMethod } from '@/types'

type DeliveryCodReceivePanelProps = {
  assignment: Assignment
  token: string | null
  onConfirmed?: (status: CodPaymentStatusResponse) => void
}

const cashLikeMethods: PaymentMethod[] = ['cod', 'bkash', 'nagad', 'rocket']

export function DeliveryCodReceivePanel({ assignment, token, onConfirmed }: DeliveryCodReceivePanelProps) {
  const [status, setStatus] = useState<CodPaymentStatusResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const isDeliveryHandover = assignment.assignmentType === 'delivery'

  async function fetchStatus(signal?: { cancelled: boolean }) {
    if (!token) return
    try {
      const res = await apiFetch<CodPaymentStatusResponse>(`/orders/${assignment.orderId}/payment-status`, { token })
      if (signal?.cancelled) return
      setStatus(res)
    } catch (err) {
      if (signal?.cancelled) return
      setError(err instanceof Error ? err.message : 'Could not read payment status')
    }
  }

  useEffect(() => {
    if (!token || !isDeliveryHandover) return
    const signal = { cancelled: false }
    setLoading(true)
    void fetchStatus(signal).finally(() => {
      if (!signal.cancelled) setLoading(false)
    })

    // Realtime: when the customer taps "I've paid" in their app, the orders
    // row updates `cod_confirmation_status`. Re-fetch on any UPDATE for this
    // order so the Confirm button enables without a manual refresh.
    const client = getSupabaseClient()
    type Channel = ReturnType<NonNullable<typeof client>['channel']>
    let channel: Channel | null = null
    if (client) {
      channel = client
        .channel(`cod-receive-${assignment.orderId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `id=eq.${assignment.orderId}`
          },
          () => {
            void fetchStatus(signal)
          }
        )
        .subscribe()
    }

    return () => {
      signal.cancelled = true
      if (channel && client) {
        void client.removeChannel(channel)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignment.orderId, token, isDeliveryHandover])

  useEffect(() => {
    if (message) toast.success(message)
  }, [message])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  if (!isDeliveryHandover) return null

  if (loading && !status) {
    return <PanelSkeleton rows={2} />
  }

  if (!status || !cashLikeMethods.includes(status.paymentMethod)) return null

  const customerConfirmed = Boolean(status.customerConfirmedAt)
  const deliveryConfirmed = Boolean(status.deliveryConfirmedAt)

  async function confirm() {
    if (!token) return
    setSubmitting(true)
    setError(null)
    setMessage(null)
    try {
      const next = await apiFetch<CodPaymentStatusResponse>(
        `/orders/${assignment.orderId}/delivery-payment-confirm`,
        { method: 'PATCH', token }
      )
      setStatus(next)
      onConfirmed?.(next)
      setMessage('Payment receipt confirmed. Customer notified.')
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail || err.message : err instanceof Error ? err.message : 'Could not confirm'
      setError(msg || 'Could not confirm payment')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
      <h2 className="flex items-center gap-2 text-lg font-bold text-ironman-navy">
        <HandCoins className="h-5 w-5 text-ironman-red" aria-hidden />
        Payment handshake
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        Two-step COD confirmation: the customer taps once they hand over the money, then you tap to confirm receipt.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <HandshakeRow
          label="Customer confirmed"
          done={customerConfirmed}
          subtitle={customerConfirmed ? 'Customer marked the cash as paid' : 'Waiting for the customer to tap in their app.'}
        />
        <HandshakeRow
          label="You confirmed"
          done={deliveryConfirmed}
          subtitle={deliveryConfirmed ? 'Receipt recorded' : 'Tap once you have the cash in hand.'}
        />
      </div>

      {!deliveryConfirmed ? (
        <button
          type="button"
          onClick={confirm}
          disabled={submitting || !customerConfirmed}
          className="tap-target focus-ring mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ironman-red px-4 py-3 font-semibold text-white disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <CheckCircle2 className="h-4 w-4" aria-hidden />}
          {submitting
            ? 'Confirming…'
            : customerConfirmed
              ? 'Confirm payment received'
              : 'Waiting for customer confirm'}
        </button>
      ) : null}
    </section>
  )
}

function HandshakeRow({ label, done, subtitle }: { label: string; done: boolean; subtitle: string }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-3 ${
        done ? 'border-emerald-200 bg-emerald-50' : 'border-ironman-navy-100 bg-ironman-navy-50'
      }`}
    >
      <span
        className={`mt-0.5 grid h-6 w-6 place-items-center rounded-full text-white ${
          done ? 'bg-emerald-500' : 'bg-gray-300'
        }`}
      >
        <CheckCircle2 className="h-4 w-4" aria-hidden />
      </span>
      <div>
        <p className="text-sm font-semibold text-ironman-navy">{label}</p>
        <p className="text-xs text-gray-600">{subtitle}</p>
      </div>
    </div>
  )
}
