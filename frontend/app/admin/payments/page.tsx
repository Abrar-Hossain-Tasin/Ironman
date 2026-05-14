import { AdminPayments } from '@/components/admin/admin-payments'
import { adminNav } from '@/components/admin/admin-nav'
import { PortalShell } from '@/components/layout/portal-shell'

export default function AdminPaymentsPage() {
  return (
    <PortalShell title="Payment Ledger" subtitle="Management panel" nav={adminNav}>
      <AdminPayments />
    </PortalShell>
  )
}
