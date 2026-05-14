'use client'

import { useState } from 'react'
import { Download, Loader2, Mail, Receipt } from 'lucide-react'
import { apiFetch, apiUrl, ApiError } from '@/lib/api'
import type { OrderResponse } from '@/types'

type ReceiptPanelProps = {
  order: OrderResponse
  token: string | null
}

export function ReceiptPanel({ order, token }: ReceiptPanelProps) {
  const [downloading, setDownloading] = useState(false)
  const [emailing, setEmailing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // Receipt is only minted after the order is delivered and at least partially paid.
  const eligible = order.status === 'delivered' && Number(order.paidAmount) > 0
  if (!eligible) return null

  async function download() {
    if (!token) return
    setDownloading(true)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch(apiUrl(`/orders/${order.id}/receipt`), {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!response.ok) throw new Error(`Could not load receipt (HTTP ${response.status})`)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `receipt_${order.orderNumber}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download receipt')
    } finally {
      setDownloading(false)
    }
  }

  async function email() {
    if (!token) return
    setEmailing(true)
    setError(null)
    setMessage(null)
    try {
      const res = await apiFetch<{ message: string }>(`/orders/${order.id}/send-receipt`, {
        method: 'POST',
        token
      })
      setMessage(res.message || 'Receipt sent to your email.')
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail || err.message : err instanceof Error ? err.message : 'Could not email receipt'
      setError(msg || 'Could not email receipt')
    } finally {
      setEmailing(false)
    }
  }

  return (
    <section className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
      <h2 className="flex items-center gap-2 text-lg font-bold text-ironman-navy">
        <Receipt className="h-5 w-5 text-ironman-red" aria-hidden />
        Receipt
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        Your invoice is ready. Download a PDF or have us email it to {order.customer.email}.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={download}
          disabled={downloading}
          className="tap-target focus-ring inline-flex items-center gap-2 rounded-lg bg-ironman-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
          {downloading ? 'Generating…' : 'Download PDF'}
        </button>
        <button
          type="button"
          onClick={email}
          disabled={emailing}
          className="tap-target focus-ring inline-flex items-center gap-2 rounded-lg border border-ironman-navy-100 bg-white px-4 py-2 text-sm font-semibold text-ironman-navy disabled:opacity-60"
        >
          {emailing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Mail className="h-4 w-4" aria-hidden />}
          {emailing ? 'Sending…' : 'Email receipt'}
        </button>
      </div>

      {message ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-3 rounded-lg bg-ironman-red-50 px-3 py-2 text-sm font-semibold text-ironman-red">{error}</p> : null}
    </section>
  )
}
