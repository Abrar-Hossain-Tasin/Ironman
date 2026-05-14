import { AdminCoupons } from '@/components/admin/admin-coupons'
import { adminNav } from '@/components/admin/admin-nav'
import { PortalShell } from '@/components/layout/portal-shell'

export default function AdminCouponsPage() {
  return (
    <PortalShell title="Coupons" subtitle="Management panel" nav={adminNav}>
      <AdminCoupons />
    </PortalShell>
  )
}
