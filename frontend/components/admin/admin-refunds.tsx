'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Loader2, WalletCards } from 'lucide-react'
import { toast } from 'sonner'
import { RequireAuth } from '@/components/auth/require-auth'
import { TableSkeleton } from '@/components/ui/skeleton'
import { apiFetch, ApiError } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { formatBdt, statusLabel } from '@/lib/utils'
import type { OrderResponse, RefundResponse, RefundStatus } from '@/types'

const STATUS_TABS: { value: '' | RefundStatus; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'processed', label: 'Processed' },
  { value: 'failed', label: 'Failed' }
]

export function AdminRefunds() {
  const token = useAuthStore((state) => state.accessToken)
  const [refunds, setRefunds] = useState<RefundResponse[]>([])
  const [orders, setOrders] = useState<OrderResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'' | RefundStatus>('')
  const [orderId, setOrderId] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [transactionReference, setTransactionReference] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function load() {
    if (!token) return
    setLoading(true)
    try {
      const [refundsList, ordersList] = await Promise.all([
        apiFetch<RefundResponse[]>('/admin/refunds', { token }),
        apiFetch<OrderResponse[]>('/admin/orders', { token })
      ])
      setRefunds(refundsList)
      setOrders(ordersList)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load refunds')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    if (message) toast.success(message)
  }, [message])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  const filtered = useMemo(
    () => (tab ? refunds.filter((refund) => refund.status === tab) : refunds),
    [tab, refunds]
  )

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token || !orderId || !amount) return
    setSubmitting(true)
    setError(null)
    setMessage(null)
    try {
      await apiFetch(`/admin/refunds/orders/${orderId}`, {
        method: 'POST',
        token,
        body: {
          amount: Number(amount),
          reason: reason.trim() || null,
          transactionReference: transactionReference.trim() || null
        }
      })
      setMessage('Refund requested')
      setAmount('')
      setReason('')
      setTransactionReference('')
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.message : err instanceof Error ? err.message : 'Could not request refund')
    } finally {
      setSubmitting(false)
    }
  }

  async function process(refund: RefundResponse) {
    if (!token) return
    try {
      await apiFetch(`/admin/refunds/${refund.id}/process`, { method: 'PUT', token })
      setMessage(`Refund ${formatBdt(refund.amount)} marked processed`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not process refund')
    }
  }

  async function fail(refund: RefundResponse) {
    if (!token) return
    const reason = prompt('Reason for failure?') ?? ''
    if (!reason.trim()) return
    try {
      await apiFetch(`/admin/refunds/${refund.id}/fail?reason=${encodeURIComponent(reason)}`, {
        method: 'PUT',
        token
      })
      setMessage('Refund marked failed')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update refund')
    }
  }

  return (
    <RequireAuth roles={['admin']}>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex flex-wrap rounded-lg border border-ironman-navy-100 bg-white p-1 text-sm shadow-soft">
              {STATUS_TABS.map((entry) => (
                <button
                  key={entry.value || 'all'}
                  type="button"
                  onClick={() => setTab(entry.value)}
                  className={`rounded-md px-3 py-1.5 font-semibold transition ${
                    tab === entry.value ? 'bg-ironman-red text-white' : 'text-ironman-navy hover:bg-ironman-navy-50'
                  }`}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <TableSkeleton rows={5} />
          ) : filtered.length === 0 ? (
            <p className="rounded-lg bg-white p-5 text-sm text-gray-600 shadow-soft">No refunds in this view.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-ironman-navy-100 bg-white shadow-soft">
              <table className="w-full text-sm">
                <thead className="bg-ironman-navy-50 text-left text-xs uppercase text-gray-600">
                  <tr>
                    <th className="px-3 py-2">Order</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Requested</th>
                    <th className="px-3 py-2">Reason</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((refund) => (
                    <tr key={refund.id} className="border-t border-ironman-navy-100">
                      <td className="px-3 py-2 font-mono text-xs text-ironman-navy">{refund.orderId.slice(0, 8)}…</td>
                      <td className="px-3 py-2 font-semibold">{formatBdt(refund.amount)}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                            refund.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : refund.status === 'processed'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-ironman-red-50 text-ironman-red'
                          }`}
                        >
                          {statusLabel(refund.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">
                        {new Date(refund.requestedAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">{refund.reason ?? '—'}</td>
                      <td className="px-3 py-2 text-right">
                        {refund.status === 'pending' ? (
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => process(refund)}
                              className="rounded-md bg-emerald-500 px-2 py-1 text-xs font-semibold text-white"
                            >
                              Process
                            </button>
                            <button
                              type="button"
                              onClick={() => fail(refund)}
                              className="rounded-md bg-ironman-red px-2 py-1 text-xs font-semibold text-white"
                            >
                              Fail
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside>
          <form className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft" onSubmit={submit}>
            <h2 className="flex items-center gap-2 text-lg font-bold text-ironman-navy">
              <WalletCards className="h-5 w-5 text-ironman-red" aria-hidden />
              Request refund
            </h2>

            <label className="mt-4 block text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Order</span>
              <select
                value={orderId}
                onChange={(event) => setOrderId(event.target.value)}
                required
                className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
              >
                <option value="">Select an order</option>
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.orderNumber} · {order.customer.fullName} · {formatBdt(order.totalAmount)}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-3 block text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Amount (BDT)</span>
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
                type="number"
                min="0.01"
                step="0.01"
                className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
              />
            </label>

            <label className="mt-3 block text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Reason (optional)</span>
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
                placeholder="Damaged item, late delivery, etc."
              />
            </label>

            <label className="mt-3 block text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Transaction reference (optional)</span>
              <input
                value={transactionReference}
                onChange={(event) => setTransactionReference(event.target.value)}
                className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
                placeholder="bKash trx ID, etc."
              />
            </label>

            <button
              type="submit"
              disabled={submitting || !orderId || !amount}
              className="tap-target focus-ring mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ironman-red px-4 py-2 font-semibold text-white disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {submitting ? 'Requesting…' : 'Request refund'}
            </button>
          </form>
        </aside>
      </div>
    </RequireAuth>
  )
}
