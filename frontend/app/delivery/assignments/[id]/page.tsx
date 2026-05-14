import { DeliveryAssignmentDetail } from '@/components/delivery/delivery-assignment-detail'
import { PortalShell } from '@/components/layout/portal-shell'

const nav = [
  { href: '/delivery/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/delivery/dashboard', label: 'Assignments', icon: 'Truck' }
]

export default async function DeliveryAssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <PortalShell title="Assignment Detail" subtitle="Delivery man app" nav={nav}>
      <DeliveryAssignmentDetail id={id} />
    </PortalShell>
  )
}
