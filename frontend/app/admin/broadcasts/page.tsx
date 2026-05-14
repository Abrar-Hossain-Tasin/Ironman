import { AdminBroadcasts } from '@/components/admin/admin-broadcasts'
import { adminNav } from '@/components/admin/admin-nav'
import { PortalShell } from '@/components/layout/portal-shell'

export default function AdminBroadcastsPage() {
  return (
    <PortalShell title="Broadcasts" subtitle="Management panel" nav={adminNav}>
      <AdminBroadcasts />
    </PortalShell>
  )
}
