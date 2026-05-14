'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { toast } from 'sonner'
import { RequireAuth } from '@/components/auth/require-auth'
import { OrderTable } from '@/components/orders/order-table'
import { TableSkeleton } from '@/components/ui/skeleton'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { orderToSummary } from '@/lib/mappers'
import { formatBdt, statusLabel } from '@/lib/utils'
import type { OrderResponse, OrderStatus } from '@/types'

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

const PAGE_SIZE = 25

function within(order: OrderResponse, from: string, to: string) {
  if (!from && !to) return true
  const created = order.createdAt.slice(0, 10)
  if (from && created < from) return false
  if (to && created > to) return false
  return true
}

function csvEscape(value: string | number | null | undefined) {
  const s = value == null ? '' : String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function downloadCsv(rows: OrderResponse[]) {
  const header = [
    'orderNumber',
    'customer',
    'phone',
    'status',
    'paymentMethod',
    'paymentStatus',
    'totalAmount',
    'paidAmount',
    'createdAt'
  ].join(',')
  const body = rows
    .map((order) =>
      [
        order.orderNumber,
        order.customer.fullName,
        order.customer.phone,
        order.status,
        order.paymentMethod,
        order.paymentStatus,
        order.totalAmount,
        order.paidAmount,
        order.createdAt
      ]
        .map(csvEscape)
        .join(',')
    )
    .join('\n')
  const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ironman-orders-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function AdminOrders() {
  const token = useAuthStore((state) => state.accessToken)
  const [orders, setOrders] = useState<OrderResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)
    setError(null)
    const path = status ? `/admin/orders?status=${status}` : '/admin/orders'
    apiFetch<OrderResponse[]>(path, { token })
      .then((rows) => {
        if (!cancelled) setOrders(rows)
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
  }, [status, token])

  useEffect(() => {
    setPage(0)
  }, [status, from, to, search])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return orders.filter((order) => {
      if (!within(order, from, to)) return false
      if (!query) return true
      return (
        order.orderNumber.toLowerCase().includes(query) ||
        order.customer.fullName.toLowerCase().includes(query) ||
        order.customer.phone.toLowerCase().includes(query) ||
        order.customer.email.toLowerCase().includes(query)
      )
    })
  }, [orders, from, to, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const visible = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)
  const summaries = visible.map(orderToSummary)

  const totalRevenue = filtered.reduce((sum, order) => sum + Number(order.totalAmount), 0)
  const totalPaid = filtered.reduce((sum, order) => sum + Number(order.paidAmount), 0)

  return (
    <RequireAuth roles={['admin']}>
      <div className="mb-4 grid gap-3 md:grid-cols-4 lg:grid-cols-5">
        <input
          className="tap-target rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 focus-ring lg:col-span-2"
          placeholder="Search by order #, customer name, phone, or email"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="tap-target rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 focus-ring"
          value={status}
          onChange={(event) => setStatus(event.target.value as OrderStatus | '')}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((item) => (
            <option key={item} value={item}>
              {statusLabel(item)}
            </option>
          ))}
        </select>
        <input
          className="tap-target rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 focus-ring"
          type="date"
          value={from}
          max={to || undefined}
          onChange={(event) => setFrom(event.target.value)}
          aria-label="From date"
        />
        <input
          className="tap-target rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 focus-ring"
          type="date"
          value={to}
          min={from || undefined}
          onChange={(event) => setTo(event.target.value)}
          aria-label="To date"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
        <p>
          {filtered.length} order{filtered.length === 1 ? '' : 's'} ·{' '}
          <span className="font-semibold text-ironman-navy">{formatBdt(totalRevenue)}</span> total ·{' '}
          <span className="font-semibold text-emerald-700">{formatBdt(totalPaid)}</span> collected
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setStatus('')
              setFrom('')
              setTo('')
              setSearch('')
            }}
            className="tap-target rounded-lg border border-ironman-navy-100 bg-white px-3 py-1.5 font-semibold text-ironman-navy hover:bg-ironman-navy-50"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => downloadCsv(filtered)}
            disabled={filtered.length === 0}
            className="tap-target inline-flex items-center gap-1 rounded-lg bg-ironman-navy px-3 py-1.5 font-semibold text-white disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" aria-hidden /> Export CSV
          </button>
          <a
            href="/admin/assignments"
            className="tap-target inline-flex items-center justify-center rounded-lg bg-ironman-red px-3 py-1.5 font-semibold text-white"
          >
            Assignment board
          </a>
        </div>
      </div>

      {loading && orders.length === 0 ? (
        <TableSkeleton rows={8} />
      ) : visible.length === 0 ? (
        <p className="rounded-lg bg-white p-5 text-sm font-semibold text-ironman-navy shadow-soft">
          No orders match the current filters.
        </p>
      ) : (
        <>
          <OrderTable orders={summaries} baseHref="/admin/orders" />
          <nav className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm" aria-label="Pagination">
            <p className="text-gray-500">
              Page {safePage + 1} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="focus-ring inline-flex items-center gap-1 rounded-lg border border-ironman-navy-100 bg-white px-3 py-1.5 font-semibold text-ironman-navy disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden /> Prev
              </button>
              <button
                type="button"
                disabled={safePage + 1 >= totalPages}
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
