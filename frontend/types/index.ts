// Auto-aligned with backend DTOs in com.ironman.dto.*.
// When the backend evolves, mirror the change here in the same PR.

export type UserRole =
  | 'admin'
  | 'customer'
  | 'delivery_man'
  | 'wash_man'
  | 'iron_man'
  | 'dry_clean_man'

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'pickup_assigned'
  | 'picked_up'
  | 'in_wash'
  | 'wash_complete'
  | 'in_dry_clean'
  | 'dry_clean_complete'
  | 'waiting_for_iron'
  | 'in_iron'
  | 'iron_complete'
  | 'ready'
  | 'delivery_assigned'
  | 'out_for_delivery'
  | 'delivered'
  | 'delivery_failed'
  | 'returned'
  | 'disputed'
  | 'cancelled'

export type AssignmentStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'rejected'
export type AssignmentType = 'pickup' | 'delivery' | 'wash' | 'iron' | 'dry_clean'

export type PaymentStatus = 'pending' | 'paid' | 'partial'
export type PaymentType =
  | 'cod_pickup'
  | 'cod_delivery'
  | 'bkash_merchant'
  | 'nagad_merchant'
  | 'rocket_merchant'
  | 'card'
  | 'advance'
  | 'partial'
export type PaymentMethod = 'cod' | 'online' | 'bkash' | 'nagad' | 'rocket' | 'card'
export type PaymentWebhookStatus = 'received' | 'processed' | 'duplicate' | 'retry_scheduled' | 'failed'

export type CodConfirmationStatus = 'pending' | 'customer_confirmed' | 'delivery_confirmed'

export type DiscountType = 'percent' | 'fixed'
export type IssueType = 'damaged' | 'missing' | 'wrong_item' | 'late' | 'other'
export type IssueStatus = 'open' | 'in_review' | 'resolved' | 'rejected'
export type RefundStatus = 'pending' | 'processed' | 'failed'

// ── Auth ─────────────────────────────────────────────────────────────────
export type UserSummary = {
  id: string
  fullName: string
  email: string
  phone: string
  role: UserRole
  profilePictureUrl?: string | null
  active: boolean
  emailVerified?: boolean
}

export type AuthResponse = {
  tokenType?: 'Cookie'
  user: UserSummary
  csrfToken?: string | null
}

// ── Addresses & catalog ──────────────────────────────────────────────────
export type AddressResponse = {
  id: string
  label: string
  addressLine1: string
  addressLine2?: string | null
  area: string
  city: string
  postalCode?: string | null
  latitude?: number | null
  longitude?: number | null
  defaultAddress: boolean
}

export type ServiceCategory = {
  id: string
  name: string
  description?: string | null
  iconUrl?: string | null
  icon?: string
  startingPrice?: number
  displayOrder?: number
}

export type ClothingType = {
  id: string
  name: string
  iconUrl?: string | null
  icon?: string
  displayOrder?: number
}

export type PricingCell = {
  id: string
  serviceCategoryId: string
  serviceCategoryName: string
  clothingTypeId: string
  clothingTypeName: string
  price: number
  currency: string
  effectiveFrom: string
  current?: boolean
}

// ── Tracking & live location ─────────────────────────────────────────────
export type TrackingEvent = {
  id: string
  orderId?: string
  status: OrderStatus
  statusLabel: string
  description: string
  updatedBy?: string | null
  updatedByName?: string | null
  actorRole?: UserRole | null
  locationLat?: number | null
  locationLng?: number | null
  timestamp: string
}

export type DeliveryLocation = {
  deliveryManId: string
  deliveryManName: string
  latitude: number
  longitude: number
  accuracy?: number | null
  orderId?: string | null
  orderNumber?: string | null
  updatedAt: string
}

// ── Orders ───────────────────────────────────────────────────────────────
export type OrderItemResponse = {
  id: string
  clothingTypeId: string
  clothingTypeName: string
  serviceCategoryId: string
  serviceCategoryName: string
  quantity: number
  actualQuantity?: number | null
  unitPrice: number
  subtotal: number
  notes?: string | null
}

export type OrderResponse = {
  id: string
  orderNumber: string
  customer: UserSummary
  pickupAddress: AddressResponse
  deliveryAddress: AddressResponse
  preferredPickupDate: string
  preferredPickupTimeSlot: string
  preferredDeliveryDate: string
  preferredDeliveryTimeSlot: string
  specialInstructions?: string | null
  status: OrderStatus
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  codConfirmationStatus?: CodConfirmationStatus | null
  customerConfirmedAt?: string | null
  deliveryConfirmedAt?: string | null
  totalAmount: number
  paidAmount: number
  discountAmount?: number | null
  couponCode?: string | null
  items: OrderItemResponse[]
  createdAt: string
  updatedAt: string
}

export type OrderSummary = {
  id: string
  orderNumber: string
  status: OrderStatus
  totalAmount: number
  paidAmount: number
  itemsCount: number
  createdAt: string
  customerName: string
}

export type OrderSearchResponse = {
  content: OrderResponse[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

// ── Quote (pre-order pricing) ────────────────────────────────────────────
export type QuoteLineRequest = {
  clothingTypeId: string
  serviceCategoryId: string
  quantity: number
}

export type QuoteRequest = {
  items: QuoteLineRequest[]
  couponCode?: string | null
}

export type QuoteLine = {
  clothingTypeId: string
  clothingTypeName: string
  serviceCategoryId: string
  serviceCategoryName: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export type QuoteResponse = {
  lines: QuoteLine[]
  subtotal: number
  discountAmount: number
  appliedCouponCode?: string | null
  total: number
}

// ── Assignments ──────────────────────────────────────────────────────────
export type Assignment = {
  id: string
  orderId: string
  orderNumber: string
  assignedTo?: UserSummary
  customerName?: string
  address?: string
  assignmentType: AssignmentType
  status: AssignmentStatus
  assignedAt?: string
  acceptedAt?: string | null
  completedAt?: string | null
  preferredTime?: string
  amountDue?: number
  notes?: string | null
  photoUrls?: string[]
}

// ── Payments & refunds ───────────────────────────────────────────────────
export type PaymentLedgerRow = {
  id: string
  orderId?: string
  orderNumber: string
  collectedBy?: string | null
  collectedByName?: string | null
  amount: number
  paymentType: PaymentType
  collectedAt: string
  paymentReference?: string | null
  payerPhone?: string | null
  verified: boolean
  notes?: string | null
  verifiedBy?: string | null
  verifiedAt?: string | null
  appliedToBalance: boolean
}

export type PaymentWebhookEventRow = {
  id: string
  provider: string
  eventId?: string | null
  idempotencyKey: string
  payloadSha256: string
  status: PaymentWebhookStatus
  orderId?: string | null
  orderNumber?: string | null
  paymentId?: string | null
  attemptCount: number
  lastError?: string | null
  nextRetryAt?: string | null
  processedAt?: string | null
  createdAt: string
  updatedAt: string
}

export type PaymentAuditEventRow = {
  id: string
  paymentId?: string | null
  orderId: string
  orderNumber: string
  actorId?: string | null
  actorName?: string | null
  actorType: string
  action: string
  previousPaymentStatus?: PaymentStatus | null
  newPaymentStatus?: PaymentStatus | null
  previousPaidAmount?: number | null
  newPaidAmount?: number | null
  notes?: string | null
  metadata?: string | null
  createdAt: string
}

export type PaymentProviderSummary = {
  provider: string
  total: number
  verifiedTotal: number
  paymentCount: number
  unverifiedCount: number
  unappliedCount: number
}

export type PaymentReconciliationResponse = {
  generatedAt: string
  ledgerTotal: number
  verifiedTotal: number
  unverifiedTotal: number
  unappliedTotal: number
  paymentCount: number
  unverifiedCount: number
  unappliedCount: number
  processedWebhookCount: number
  retryScheduledWebhookCount: number
  failedWebhookCount: number
  providerSummaries: PaymentProviderSummary[]
  recentWebhookEvents: PaymentWebhookEventRow[]
  recentAuditEvents: PaymentAuditEventRow[]
}

export type CodPaymentStatusResponse = {
  orderId: string
  orderNumber: string
  paymentMethod: PaymentMethod
  codConfirmationStatus: CodConfirmationStatus
  customerConfirmedAt?: string | null
  deliveryConfirmedAt?: string | null
}

export type RefundResponse = {
  id: string
  orderId: string
  amount: number
  reason?: string | null
  status: RefundStatus
  originalMethod?: PaymentMethod | null
  transactionReference?: string | null
  requestedBy?: string | null
  processedBy?: string | null
  requestedAt: string
  processedAt?: string | null
}

// ── Coupons ──────────────────────────────────────────────────────────────
export type CouponResponse = {
  id: string
  code: string
  description?: string | null
  discountType: DiscountType
  discountValue: number
  minOrderAmount?: number | null
  maxDiscountAmount?: number | null
  validFrom?: string | null
  validTo?: string | null
  maxUses?: number | null
  currentUses: number
  maxUsesPerUser: number
  active: boolean
}

// ── Issues & reviews ─────────────────────────────────────────────────────
export type IssueResponse = {
  id: string
  orderId: string
  reportedBy: string
  reportedByName: string
  type: IssueType
  description: string
  photoUrls: string[]
  status: IssueStatus
  resolutionNotes?: string | null
  refundAmount?: number | null
  resolvedBy?: string | null
  createdAt: string
  resolvedAt?: string | null
}

export type ReviewResponse = {
  id: string
  orderId: string
  customerId: string
  customerName: string
  deliveryManId?: string | null
  overallRating: number
  serviceRating?: number | null
  deliveryRating?: number | null
  comment?: string | null
  createdAt: string
}

// ── Notifications ────────────────────────────────────────────────────────
export type NotificationResponse = {
  id: string
  title: string
  body: string
  type: string
  referenceId?: string | null
  read: boolean
  createdAt: string
}

// ── Admin: customers list + detail envelope ──────────────────────────────
export type CustomerSummary = {
  id: string
  fullName: string
  email: string
  phone: string
  active: boolean
  emailVerified: boolean
  createdAt: string
  orderCount: number
  totalSpent: number
  totalPaid: number
  openIssues: number
  lastOrderAt?: string | null
}

export type CustomerListResponse = {
  content: CustomerSummary[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type CustomerDetailResponse = {
  id: string
  fullName: string
  email: string
  phone: string
  active: boolean
  emailVerified: boolean
  createdAt: string
  addresses: AddressResponse[]
  orderCount: number
  totalSpent: number
  totalPaid: number
  totalRefunded: number
  openIssues: number
  orders: OrderResponse[]
  payments: PaymentLedgerRow[]
  refunds: RefundResponse[]
  issues: IssueResponse[]
}

// ── Admin reports summary ────────────────────────────────────────────────
export type ReportSummaryResponse = {
  windowDays: number
  orderCount: number
  deliveredCount: number
  failedCount: number
  deliverySuccessPct?: number | null
  grossRevenue: number
  refundedAmount: number
  netRevenue: number
  averageOrderValue: number
  topServices: { name: string; quantity: number }[]
  topCollectors: { name: string; total: number; count: number }[]
  daily: { date: string; orders: number; revenue: number }[]
}

// ── Pickup / delivery slot capacity ──────────────────────────────────────
export type SlotRow = {
  slot: string
  capacity: number
  booked: number
  remaining: number
  full: boolean
}

export type SlotAvailabilityResponse = {
  date: string
  pickup: SlotRow[]
  delivery: SlotRow[]
}

// ── Delivery agent earnings ──────────────────────────────────────────────
export type DeliveryEarningsResponse = {
  from: string
  to: string
  totalCollected: number
  transactionCount: number
  payments: PaymentLedgerRow[]
}
