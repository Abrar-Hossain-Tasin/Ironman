import type { Assignment, OrderResponse, OrderSummary, PaymentLedgerRow } from '@/types'

export function orderToSummary(order: OrderResponse): OrderSummary {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    totalAmount: Number(order.totalAmount),
    paidAmount: Number(order.paidAmount),
    itemsCount: order.items.reduce((sum, item) => sum + Number(item.quantity), 0),
    createdAt: order.createdAt,
    customerName: order.customer.fullName
  }
}

export function assignmentCustomerName(assignment: Assignment) {
  return assignment.customerName ?? assignment.assignedTo?.fullName ?? 'Assigned staff'
}

export function paymentCollectorName(payment: PaymentLedgerRow) {
  return payment.collectedByName ?? 'Unassigned'
}
