import { AdminStaff } from '@/components/admin/admin-staff'
import { adminNav } from '@/components/admin/admin-nav'
import { PortalShell } from '@/components/layout/portal-shell'

export default function AdminStaffPage() {
  return (
    <PortalShell title="Staff Management" subtitle="Management panel" nav={adminNav}>
      <AdminStaff />
    </PortalShell>
  )
}
