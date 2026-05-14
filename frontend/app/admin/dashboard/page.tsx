import { AdminDashboard } from '@/components/admin/admin-dashboard'
import { adminNav } from '@/components/admin/admin-nav'
import { PortalShell } from '@/components/layout/portal-shell'

export default function AdminDashboardPage() {
  return (
    <PortalShell title="Admin Dashboard" subtitle="Management panel" nav={adminNav}>
      <AdminDashboard />
    </PortalShell>
  )
}
