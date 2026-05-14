'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { RequireAuth } from '@/components/auth/require-auth'
import { MetricCard } from '@/components/ui/metric-card'
import { OrderTable } from '@/components/orders/order-table'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { orderToSummary } from '@/lib/mappers'
import { formatBdt } from '@/lib/utils'
import type { OrderResponse, PaymentLedgerRow } from '@/types'

export function AdminDashboard() {
  const token = useAuthStore((state) => state.accessToken)
  const [orders, setOrders] = useState<OrderResponse[]>([])
  const [payments, setPayments] = useState<PaymentLedgerRow[]>([])

  useEffect(() => {
    if (!token) return
    Promise.all([
      apiFetch<OrderResponse[]>('/admin/orders', { token }),
      apiFetch<PaymentLedgerRow[]>('/payments', { token })
    ]).then(([nextOrders, nextPayments]) => {
      setOrders(nextOrders)
      setPayments(nextPayments)
    })
  }, [token])

  const summaries = useMemo(() => orders.map(orderToSummary), [orders])
  const pendingAssignments = orders.filter((order) => ['confirmed', 'ready'].includes(order.status)).length
  const activeDeliveries = orders.filter((order) => ['pickup_assigned', 'delivery_assigned', 'out_for_delivery'].includes(order.status)).length
  const revenue = payments.reduce((sum, payment) => sum + Number(payment.amount), 0)

  return (
    <RequireAuth roles={['admin']}>
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Total orders" value={String(orders.length)} icon="PackageCheck" tone="red" />
        <MetricCard label="Pending assignments" value={String(pendingAssignments)} icon="Truck" />
        <MetricCard label="Revenue logged" value={formatBdt(revenue)} icon="WalletCards" tone="navy" />
        <MetricCard label="Active deliveries" value={String(activeDeliveries)} icon="Clock3" />
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-ironman-navy">Live order feed</h2>
        <Link href="/admin/orders" className="font-semibold text-ironman-red">Manage orders</Link>
      </div>
      <div className="mt-4">
        <OrderTable orders={summaries} baseHref="/admin/orders" />
      </div>
    </RequireAuth>
  )
}
