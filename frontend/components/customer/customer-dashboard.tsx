'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RequireAuth } from '@/components/auth/require-auth'
import { MetricCard } from '@/components/ui/metric-card'
import { OrderTable } from '@/components/orders/order-table'
import { TableSkeleton } from '@/components/ui/skeleton'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { orderToSummary } from '@/lib/mappers'
import { formatBdt } from '@/lib/utils'
import type { OrderResponse, OrderSearchResponse } from '@/types'

const RECENT_PAGE_SIZE = 10

export function CustomerDashboard() {
  const token = useAuthStore((state) => state.accessToken)
  const [recent, setRecent] = useState<OrderResponse[]>([])
  const [totals, setTotals] = useState<{ active: number; delivered: number; due: number }>({ active: 0, delivered: 0, due: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)

    // 1) Recent page for the table (paginated, cheap).
    // 2) A "wide" page only counting up to 200 orders for the top metric cards.
    //    Cheap enough at typical customer history sizes; once /admin/reports/summary
    //    style aggregates land for customers too we can swap this for a single call.
    Promise.all([
      apiFetch<OrderSearchResponse>(`/orders/search?page=0&size=${RECENT_PAGE_SIZE}`, { token }),
      apiFetch<OrderSearchResponse>('/orders/search?page=0&size=200', { token })
    ])
      .then(([recentPage, wide]) => {
        if (cancelled) return
        setRecent(recentPage.content)
        const active = wide.content.filter(
          (order) => !['delivered', 'cancelled', 'returned'].includes(order.status)
        ).length
        const delivered = wide.content.filter((order) => order.status === 'delivered').length
        const due = wide.content.reduce(
          (sum, order) => sum + Math.max(0, Number(order.totalAmount) - Number(order.paidAmount)),
          0
        )
        setTotals({ active, delivered, due })
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
  }, [token])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  const summaries = useMemo(() => recent.map(orderToSummary), [recent])

  return (
    <RequireAuth roles={['customer']}>
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Active orders" value={String(totals.active)} icon="PackageCheck" tone="red" />
        <MetricCard label="Awaiting payment" value={formatBdt(totals.due)} icon="WalletCards" />
        <MetricCard label="Delivered" value={String(totals.delivered)} icon="Check" tone="navy" />
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-ironman-navy">Recent orders</h2>
        <Link href="/customer/orders/new" className="tap-target focus-ring inline-flex items-center justify-center rounded-lg bg-ironman-red px-4 py-2 font-semibold text-white">
          Place New Order
        </Link>
      </div>
      <div className="mt-4">
        {loading && recent.length === 0 ? (
          <TableSkeleton rows={6} />
        ) : recent.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ironman-navy-100 bg-white p-8 text-center shadow-soft">
            <p className="text-sm font-semibold text-ironman-navy">No orders yet</p>
            <p className="mt-1 text-xs text-gray-500">Place your first order to see it tracked here.</p>
            <Link
              href="/customer/orders/new"
              className="tap-target focus-ring mt-4 inline-flex items-center justify-center rounded-lg bg-ironman-red px-4 py-2 text-sm font-semibold text-white"
            >
              Place an order
            </Link>
          </div>
        ) : (
          <OrderTable orders={summaries} />
        )}
      </div>
    </RequireAuth>
  )
}
