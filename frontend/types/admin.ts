// Admin-specific aggregate types. Re-exports + augments the shared DTOs in
// ./index.ts so admin features can import a single namespace.
//
// Keep this 1:1 with com.ironman.dto.* — when the backend evolves, mirror it
// here in the same PR.

import type {
  Assignment,
  CodConfirmationStatus,
  CustomerDetailResponse,
  CustomerListResponse,
  CustomerSummary,
  IssueResponse,
  OrderResponse,
  OrderStatus,
  PaymentLedgerRow,
  PaymentMethod,
  PaymentStatus,
  ReportSummaryResponse,
  UserRole,
  UserSummary
} from './index'

export type {
  Assignment,
  CodConfirmationStatus,
  CustomerDetailResponse,
  CustomerListResponse,
  CustomerSummary,
  IssueResponse,
  OrderResponse,
  OrderStatus,
  PaymentLedgerRow,
  PaymentMethod,
  PaymentStatus,
  ReportSummaryResponse,
  UserRole,
  UserSummary
}

// ── Admin filter / query inputs ─────────────────────────────────────────────

export type AdminOrdersQuery = {
  status?: OrderStatus | null
  codConfirmationStatus?: CodConfirmationStatus | null
  from?: string | null
  to?: string | null
  search?: string | null
}

// ── Pipeline tone for status-badge styling ──────────────────────────────────
// Status → tone mapping used by the OrderStatusBadge. Kept here (not in the
// component) so any module wanting the same brand tone for a status agrees.

export type StatusTone = 'navy' | 'amber' | 'cyan' | 'emerald' | 'red' | 'slate'

export const ORDER_STATUS_TONE: Record<OrderStatus, StatusTone> = {
  pending: 'slate',
  confirmed: 'navy',
  pickup_assigned: 'navy',
  picked_up: 'cyan',
  in_wash: 'cyan',
  wash_complete: 'cyan',
  in_dry_clean: 'cyan',
  dry_clean_complete: 'cyan',
  waiting_for_iron: 'amber',
  in_iron: 'amber',
  iron_complete: 'amber',
  ready: 'emerald',
  delivery_assigned: 'amber',
  out_for_delivery: 'amber',
  delivered: 'emerald',
  delivery_failed: 'red',
  returned: 'red',
  disputed: 'red',
  cancelled: 'slate'
}

// ── Pulse-dashboard aggregates derived client-side from orders/payments ─────

export type PulseSnapshot = {
  activeWashLoad: number
  todaysRevenue: number
  todaysRevenueVerified: number
  deliveryBottlenecks: number
  staleActiveOrders: number
  unverifiedPayments: number
}

// ── Audit-trail label shape (rendered next to pricing rows) ────────────────

export type AuditLabel = {
  updatedBy?: string | null
  updatedAt?: string | null
}
