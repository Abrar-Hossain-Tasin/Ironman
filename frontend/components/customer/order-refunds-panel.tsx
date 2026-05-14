'use client'

import { useEffect, useState } from 'react'
import { Coins } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { formatBdt, statusLabel } from '@/lib/utils'
import type { RefundResponse } from '@/types'

type OrderRefundsPanelProps = {
  orderId: string
  token: string | null
}

export function OrderRefundsPanel({ orderId, token }: OrderRefundsPanelProps) {
  const [refunds, setRefunds] = useState<RefundResponse[] | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    apiFetch<RefundResponse[]>(`/orders/${orderId}/refunds`, { token })
      .then((res) => {
        if (!cancelled) setRefunds(res)
      })
      .catch(() => {
        if (!cancelled) setRefunds([])
      })
    return () => {
      cancelled = true
    }
  }, [token, orderId])

  if (!refunds || refunds.length === 0) return null

  return (
    <section className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
      <h2 className="flex items-center gap-2 text-lg font-bold text-ironman-navy">
        <Coins className="h-5 w-5 text-ironman-red" aria-hidden />
        Refunds
      </h2>
      <p className="mt-1 text-sm text-gray-600">All refunds processed against this order.</p>
      <ul className="mt-3 divide-y divide-ironman-navy-100">
        {refunds.map((refund) => (
          <li key={refund.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
            <div>
              <p className="font-semibold text-ironman-navy">{formatBdt(Number(refund.amount))}</p>
              <p className="text-xs text-gray-600">
                {refund.reason || 'No reason on file'}
                {refund.originalMethod ? ` · refunded to ${statusLabel(refund.originalMethod)}` : null}
              </p>
              {refund.transactionReference ? (
                <p className="text-xs text-gray-500">Ref: {refund.transactionReference}</p>
              ) : null}
            </div>
            <div className="text-right">
              <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${badgeForStatus(refund.status)}`}>
                {statusLabel(refund.status)}
              </span>
              <p className="mt-1 text-xs text-gray-500">
                Requested {new Date(refund.requestedAt).toLocaleDateString()}
                {refund.processedAt ? ` · Processed ${new Date(refund.processedAt).toLocaleDateString()}` : ''}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function badgeForStatus(status: string) {
  if (status === 'processed') return 'bg-emerald-100 text-emerald-700'
  if (status === 'failed') return 'bg-ironman-red-50 text-ironman-red'
  return 'bg-ironman-navy-50 text-ironman-navy'
}
