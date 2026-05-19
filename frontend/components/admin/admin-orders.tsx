'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { AssignDriverSheet } from '@/components/admin/assign-driver-sheet'
import { OrdersDataTable } from '@/components/admin/orders-data-table'
import { useAdminOrders } from '@/components/admin/hooks/use-admin-orders'
import { RequireAuth } from '@/components/auth/require-auth'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { TableSkeleton } from '@/components/ui/skeleton'
import { downloadCsv } from '@/lib/csv'
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

function within(order: OrderResponse, from: string, to: string) {
  if (!from && !to) return true
  const created = order.createdAt.slice(0, 10)
  if (from && created < from) return false
  if (to && created > to) return false
  return true
}

function exportOrdersCsv(rows: OrderResponse[]) {
  downloadCsv(
    `ironman-orders-${new Date().toISOString().slice(0, 10)}.csv`,
    ['orderNumber', 'customer', 'phone', 'status', 'paymentMethod', 'paymentStatus', 'totalAmount', 'paidAmount', 'createdAt'],
    rows.map((order) => [
      order.orderNumber,
      order.customer.fullName,
      order.customer.phone,
      order.status,
      order.paymentMethod,
      order.paymentStatus,
      order.totalAmount,
      order.paidAmount,
      order.createdAt
    ])
  )
}

export function AdminOrders() {
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const [assignOrder, setAssignOrder] = useState<OrderResponse | null>(null)

  const ordersQuery = useAdminOrders({ status })

  // Surface fetch errors with a toast, matching how every other admin page
  // does it. Effect (not direct call in render) so a re-render doesn't re-fire.
  useEffect(() => {
    if (!ordersQuery.isError) return
    const message = (ordersQuery.error as Error)?.message ?? 'Could not load orders'
    toast.error(message)
  }, [ordersQuery.isError, ordersQuery.error])

  const orders = ordersQuery.data ?? []
  const filtered = useMemo(() => orders.filter((order) => within(order, from, to)), [orders, from, to])

  const totalRevenue = filtered.reduce((sum, order) => sum + Number(order.totalAmount), 0)
  const totalPaid = filtered.reduce((sum, order) => sum + Number(order.paidAmount), 0)

  return (
    <RequireAuth roles={['admin']}>
      <ErrorBoundary title="The orders console hit an error.">
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
              onClick={() => exportOrdersCsv(filtered)}
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

        {ordersQuery.isLoading ? (
          <TableSkeleton rows={8} />
        ) : (
          <OrdersDataTable
            data={filtered}
            globalFilter={search}
            onAssign={(order) => setAssignOrder(order)}
          />
        )}

        <AssignDriverSheet
          order={assignOrder}
          open={assignOrder !== null}
          onOpenChange={(next) => {
            if (!next) setAssignOrder(null)
          }}
        />
      </ErrorBoundary>
    </RequireAuth>
  )
}
