import type { OrderStatus } from '@/types'

export const lifecycle: OrderStatus[] = [
  'pending',
  'confirmed',
  'pickup_assigned',
  'picked_up',
  'in_wash',
  'wash_complete',
  'waiting_for_iron',
  'in_iron',
  'iron_complete',
  'ready',
  'delivery_assigned',
  'out_for_delivery',
  'delivered'
]
