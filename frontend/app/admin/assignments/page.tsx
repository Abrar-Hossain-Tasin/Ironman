import { AdminAssignments } from '@/components/admin/admin-assignments'
import { adminNav } from '@/components/admin/admin-nav'
import { PortalShell } from '@/components/layout/portal-shell'

export default function AdminAssignmentsPage() {
  return (
    <PortalShell title="Assignment Board" subtitle="Management panel" nav={adminNav}>
      <AdminAssignments />
    </PortalShell>
  )
}
