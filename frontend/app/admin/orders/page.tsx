import { AdminOrders } from '@/components/admin/admin-orders'
import { adminNav } from '@/components/admin/admin-nav'
import { PortalShell } from '@/components/layout/portal-shell'

export default function AdminOrdersPage() {
  return (
    <PortalShell title="Order Management" subtitle="Management panel" nav={adminNav}>
      <AdminOrders />
    </PortalShell>
  )
}
