import { CustomerOrders } from '@/components/customer/customer-orders'
import { PortalShell } from '@/components/layout/portal-shell'

const nav = [
  { href: '/customer/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/customer/orders/new', label: 'New Order', icon: 'PackageCheck' },
  { href: '/customer/orders', label: 'Orders', icon: 'ListChecks' },
  { href: '/customer/profile', label: 'Profile', icon: 'UserRound' }
]

export default function CustomerOrdersPage() {
  return (
    <PortalShell title="Order History" subtitle="Customer portal" nav={nav}>
      <CustomerOrders />
    </PortalShell>
  )
}
