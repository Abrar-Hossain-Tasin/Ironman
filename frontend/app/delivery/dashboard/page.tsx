import { DeliveryDashboard } from '@/components/delivery/delivery-dashboard'
import { PortalShell } from '@/components/layout/portal-shell'

const nav = [
  { href: '/delivery/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/delivery/assignments', label: 'Assignments', icon: 'Truck' } // Change this href
]

export default function DeliveryDashboardPage() {
  return (
    <PortalShell title="Delivery Dashboard" subtitle="Delivery man app" nav={nav}>
      <DeliveryDashboard />
    </PortalShell>
  )
}
