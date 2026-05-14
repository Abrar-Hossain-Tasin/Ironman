'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { RequireAuth } from '@/components/auth/require-auth'
import { OrderTable } from '@/components/orders/order-table'
import { TableSkeleton } from '@/components/ui/skeleton'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { orderToSummary } from '@/lib/mappers'
import { statusLabel } from '@/lib/utils'
import type { OrderResponse, OrderSearchResponse, OrderStatus } from '@/types'

const PAGE_SIZE = 20

const STATUS_OPTIONS: OrderStatus[] = [
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
  'out_for_delivery',
  'delivered',
  'delivery_failed',
  'returned',
  'disputed',
  'cancelled'
]

export function CustomerOrders() {
  const token = useAuthStore((state) => state.accessToken)
  const [orders, setOrders] = useState<OrderResponse[]>([])
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('size', String(PAGE_SIZE))
    if (status) params.set('status', status)
    if (from) params.set('from', from)
    if (to) params.set('to', to)

    apiFetch<OrderSearchResponse>(`/orders/search?${params.toString()}`, { token })
      .then((res) => {
        if (cancelled) return
        setOrders(res.content)
        setTotalPages(Math.max(1, res.totalPages))
        setTotalElements(res.totalElements)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load orders')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token, status, from, to, page])

  // Whenever any filter changes, jump back to page 0.
  useEffect(() => {
    setPage(0)
  }, [status, from, to])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  const summaries = useMemo(() => orders.map(orderToSummary), [orders])

  return (
    <RequireAuth roles={['customer']}>
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as OrderStatus | '')}
            className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 focus-ring"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {statusLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">From</span>
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => setFrom(event.target.value)}
            className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 focus-ring"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">To</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => setTo(event.target.value)}
            className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 focus-ring"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setStatus('')
            setFrom('')
            setTo('')
          }}
          className="tap-target self-end rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 text-sm font-semibold text-ironman-navy hover:bg-ironman-navy-50"
        >
          Reset filters
        </button>
      </div>

      {loading && orders.length === 0 ? (
        <TableSkeleton rows={8} />
      ) : orders.length === 0 ? (
        <p className="rounded-lg bg-white p-5 text-sm font-semibold text-ironman-navy shadow-soft">
          No orders match the selected filters.
        </p>
      ) : (
        <>
          <OrderTable orders={summaries} />
          <nav
            className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm"
            aria-label="Pagination"
          >
            <p className="text-gray-500">
              Page {page + 1} of {totalPages} · {totalElements} order{totalElements === 1 ? '' : 's'}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 0 || loading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="focus-ring inline-flex items-center gap-1 rounded-lg border border-ironman-navy-100 bg-white px-3 py-1.5 font-semibold text-ironman-navy disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden /> Prev
              </button>
              <button
                type="button"
                disabled={page + 1 >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="focus-ring inline-flex items-center gap-1 rounded-lg border border-ironman-navy-100 bg-white px-3 py-1.5 font-semibold text-ironman-navy disabled:opacity-50"
              >
                Next <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </nav>
        </>
      )}
    </RequireAuth>
  )
}
