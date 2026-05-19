import { AdminOrderDetail } from '@/components/admin/admin-order-detail'
import { adminNav } from '@/components/admin/admin-nav'
import { PortalShell } from '@/components/layout/portal-shell'

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <PortalShell title="Admin Order Detail" subtitle="Management panel" nav={adminNav}>
      <AdminOrderDetail id={id} />
    </PortalShell>
  )
}
