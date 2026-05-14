import { CustomerOrderDetail } from '@/components/customer/customer-order-detail'
import { PortalShell } from '@/components/layout/portal-shell'

const nav = [
  { href: '/customer/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/customer/orders/new', label: 'New Order', icon: 'PackageCheck' },
  { href: '/customer/orders', label: 'Orders', icon: 'ListChecks' },
  { href: '/customer/profile', label: 'Profile', icon: 'UserRound' }
]

export default async function CustomerOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <PortalShell title="Order Detail" subtitle="Order detail" nav={nav}>
      <CustomerOrderDetail id={id} />
    </PortalShell>
  )
}
