'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { CheckCircle2, CreditCard, QrCode, WalletCards } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { formatBdt } from '@/lib/utils'
import type { OrderResponse, PaymentLedgerRow, PaymentMethod } from '@/types'

type OrderPaymentPanelProps = {
  order: OrderResponse
  token: string | null
  onPaymentRecorded: (payment: PaymentLedgerRow) => void
}

const merchantName = process.env.NEXT_PUBLIC_BKASH_MERCHANT_NAME ?? 'IRONMAN Laundry'
const merchantNumber = process.env.NEXT_PUBLIC_BKASH_MERCHANT_NUMBER ?? '01XXXXXXXXX'

export function OrderPaymentPanel({ order, token, onPaymentRecorded }: OrderPaymentPanelProps) {
  const due = Math.max(0, Number(order.totalAmount) - Number(order.paidAmount))
  const [method, setMethod] = useState<PaymentMethod>(order.paymentMethod)
  const [transactionId, setTransactionId] = useState('')
  const [payerPhone, setPayerPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canSubmitBkash = useMemo(() => due > 0 && transactionId.trim().length >= 6, [due, transactionId])

  useEffect(() => {
    if (message) toast.success(message)
  }, [message])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  async function submitBkash(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token || !canSubmitBkash) return

    setSubmitting(true)
    setError(null)
    setMessage(null)
    try {
      const payment = await apiFetch<PaymentLedgerRow>(`/orders/${order.id}/payments/bkash`, {
        method: 'POST',
        token,
        body: {
          amount: due,
          transactionId: transactionId.trim(),
          payerPhone: payerPhone.trim(),
          notes: notes.trim()
        }
      })
      onPaymentRecorded(payment)
      setTransactionId('')
      setPayerPhone('')
      setNotes('')
      setMessage('bKash payment submitted for admin verification.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit bKash payment')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-ironman-navy">
            <WalletCards className="h-5 w-5 text-ironman-red" aria-hidden />
            Payment
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {due > 0 ? `${formatBdt(due)} remaining` : 'This order is fully paid'}
          </p>
        </div>
        <span className="rounded-full bg-ironman-navy-50 px-3 py-1 text-sm font-semibold text-ironman-navy">
          {order.paymentStatus}
        </span>
      </div>

      {due <= 0 ? (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="h-5 w-5" aria-hidden />
          Payment complete
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <PaymentChoice
              active={method === 'cod'}
              icon={CreditCard}
              title="Pay delivery man"
              body="Hand the amount to the delivery man. He confirms cash received from his delivery app."
              onClick={() => setMethod('cod')}
            />
            <PaymentChoice
              active={method === 'online'}
              icon={QrCode}
              title="bKash merchant QR"
              body="Scan the company merchant QR, then submit your bKash transaction ID here."
              onClick={() => setMethod('online')}
            />
          </div>

          {method === 'cod' ? (
            <div className="mt-4 rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 p-4">
              <p className="font-semibold text-ironman-navy">Direct payment to delivery man</p>
              <p className="mt-2 text-sm text-gray-600">
                Pay {formatBdt(due)} directly to the assigned delivery man. Once he taps cash received, your paid amount and payment status update automatically.
              </p>
            </div>
          ) : (
            <form className="mt-4 grid gap-4 lg:grid-cols-[180px_1fr]" onSubmit={submitBkash}>
              <div className="rounded-lg border border-ironman-navy-100 bg-white p-3">
                <Image src="/payment-qr.svg" width={160} height={160} alt="IRONMAN Laundry bKash merchant QR" className="h-auto w-full" />
              </div>
              <div>
                <div className="rounded-lg bg-ironman-navy-50 p-3 text-sm text-gray-700">
                  <p><span className="font-semibold text-ironman-navy">Merchant:</span> {merchantName}</p>
                  <p><span className="font-semibold text-ironman-navy">bKash:</span> {merchantNumber}</p>
                  <p><span className="font-semibold text-ironman-navy">Amount:</span> {formatBdt(due)}</p>
                </div>
                <input
                  className="tap-target mt-3 w-full rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 focus-ring"
                  value={transactionId}
                  onChange={(event) => setTransactionId(event.target.value)}
                  placeholder="bKash transaction ID"
                  required
                />
                <input
                  className="tap-target mt-3 w-full rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 focus-ring"
                  value={payerPhone}
                  onChange={(event) => setPayerPhone(event.target.value)}
                  placeholder="Sender bKash number"
                />
                <input
                  className="tap-target mt-3 w-full rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 focus-ring"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional note"
                />
                <button
                  className="tap-target focus-ring mt-3 w-full rounded-lg bg-ironman-red px-4 py-3 font-semibold text-white disabled:opacity-60"
                  type="submit"
                  disabled={submitting || !canSubmitBkash}
                >
                  {submitting ? 'Submitting...' : 'Submit bKash payment'}
                </button>
              </div>
            </form>
          )}
        </>
      )}

    </section>
  )
}

function PaymentChoice({
  active,
  icon: Icon,
  title,
  body,
  onClick
}: {
  active: boolean
  icon: typeof CreditCard
  title: string
  body: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`focus-ring rounded-lg border p-4 text-left transition ${
        active ? 'border-ironman-red bg-ironman-red-50' : 'border-ironman-navy-100 bg-white'
      }`}
    >
      <span className="flex items-center gap-2 font-bold text-ironman-navy">
        <Icon className="h-5 w-5 text-ironman-red" aria-hidden />
        {title}
      </span>
      <span className="mt-2 block text-sm text-gray-600">{body}</span>
    </button>
  )
}
