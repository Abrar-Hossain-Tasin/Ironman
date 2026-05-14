import { AdminPricing } from '@/components/admin/admin-pricing'
import { adminNav } from '@/components/admin/admin-nav'
import { PortalShell } from '@/components/layout/portal-shell'

export default function AdminPricingPage() {
  return (
    <PortalShell title="Pricing Management" subtitle="Management panel" nav={adminNav}>
      <AdminPricing />
    </PortalShell>
  )
}
