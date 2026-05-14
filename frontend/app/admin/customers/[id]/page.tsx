import { AdminCustomerDetail } from '@/components/admin/admin-customer-detail'
import { adminNav } from '@/components/admin/admin-nav'
import { PortalShell } from '@/components/layout/portal-shell'

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <PortalShell title="Customer 360" subtitle="Management panel" nav={adminNav}>
      <AdminCustomerDetail customerId={id} />
    </PortalShell>
  )
}
