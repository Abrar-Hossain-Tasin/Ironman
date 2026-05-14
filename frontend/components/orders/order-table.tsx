import Link from 'next/link'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatBdt } from '@/lib/utils'
import type { OrderSummary } from '@/types'

type OrderTableProps = {
  orders: OrderSummary[]
  baseHref?: string
}

export function OrderTable({ orders, baseHref = '/customer/orders' }: OrderTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-ironman-navy-100 bg-white shadow-soft">
      <table className="min-w-[760px] w-full text-sm">
        <thead className="bg-ironman-navy text-white">
          <tr>
            <th className="px-4 py-4 text-left">Order</th>
            <th className="px-4 py-4 text-left">Customer</th>
            <th className="px-4 py-4 text-left">Items</th>
            <th className="px-4 py-4 text-left">Total</th>
            <th className="px-4 py-4 text-left">Status</th>
            <th className="px-4 py-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, index) => (
            <tr key={order.id} className={index % 2 === 0 ? 'bg-white' : 'bg-ironman-navy-50'}>
              <td className="px-4 py-4 font-semibold text-ironman-navy">{order.orderNumber}</td>
              <td className="px-4 py-4">{order.customerName}</td>
              <td className="px-4 py-4">{order.itemsCount}</td>
              <td className="px-4 py-4 font-semibold text-ironman-navy">{formatBdt(order.totalAmount)}</td>
              <td className="px-4 py-4"><StatusBadge status={order.status} /></td>
              <td className="px-4 py-4 text-right">
                <Link href={`${baseHref}/${order.id}`} className="font-semibold text-ironman-red">
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
