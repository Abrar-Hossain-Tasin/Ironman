import { CustomerDashboard } from '@/components/customer/customer-dashboard'
import { PortalShell } from '@/components/layout/portal-shell'

const nav = [
  { href: '/customer/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/customer/orders/new', label: 'New Order', icon: 'PackageCheck' },
  { href: '/customer/orders', label: 'Orders', icon: 'ListChecks' },
  { href: '/customer/profile', label: 'Profile', icon: 'UserRound' }
]

export default function CustomerDashboardPage() {
  return (
    <PortalShell title="Customer Dashboard" subtitle="Customer portal" nav={nav}>
      <CustomerDashboard />
    </PortalShell>
  )
}
