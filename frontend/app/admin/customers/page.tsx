import { AdminCustomers } from '@/components/admin/admin-customers'
import { adminNav } from '@/components/admin/admin-nav'
import { PortalShell } from '@/components/layout/portal-shell'

export default function AdminCustomersPage() {
  return (
    <PortalShell title="Customers" subtitle="Management panel" nav={adminNav}>
      <AdminCustomers />
    </PortalShell>
  )
}
