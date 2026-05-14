import { CustomerProfile } from '@/components/customer/customer-profile'
import { PortalShell } from '@/components/layout/portal-shell'

const nav = [
  { href: '/customer/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/customer/orders/new', label: 'New Order', icon: 'PackageCheck' },
  { href: '/customer/orders', label: 'Orders', icon: 'ListChecks' },
  { href: '/customer/profile', label: 'Profile', icon: 'UserRound' }
]

export default function CustomerProfilePage() {
  return (
    <PortalShell title="Profile & Addresses" subtitle="Customer portal" nav={nav}>
      <CustomerProfile />
    </PortalShell>
  )
}
