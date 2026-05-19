import { Badge } from '@/components/ui/badge'
import { ORDER_STATUS_TONE } from '@/types/admin'
import type { OrderStatus } from '@/types'
import { statusLabel } from '@/lib/utils'

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const tone = ORDER_STATUS_TONE[status] ?? 'navy'
  return <Badge tone={tone}>{statusLabel(status)}</Badge>
}
