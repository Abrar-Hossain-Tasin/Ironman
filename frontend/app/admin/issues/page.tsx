import { AdminIssues } from '@/components/admin/admin-issues'
import { adminNav } from '@/components/admin/admin-nav'
import { PortalShell } from '@/components/layout/portal-shell'

export default function AdminIssuesPage() {
  return (
    <PortalShell title="Issue queue" subtitle="Management panel" nav={adminNav}>
      <AdminIssues />
    </PortalShell>
  )
}
