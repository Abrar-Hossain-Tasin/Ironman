import { AdminRefunds } from '@/components/admin/admin-refunds'
import { adminNav } from '@/components/admin/admin-nav'
import { PortalShell } from '@/components/layout/portal-shell'

export default function AdminRefundsPage() {
  return (
    <PortalShell title="Refunds" subtitle="Management panel" nav={adminNav}>
      <AdminRefunds />
    </PortalShell>
  )
}
