import { AdminReports } from '@/components/admin/admin-reports'
import { adminNav } from '@/components/admin/admin-nav'
import { PortalShell } from '@/components/layout/portal-shell'

export default function AdminReportsPage() {
  return (
    <PortalShell title="Reports" subtitle="Management panel" nav={adminNav}>
      <AdminReports />
    </PortalShell>
  )
}
