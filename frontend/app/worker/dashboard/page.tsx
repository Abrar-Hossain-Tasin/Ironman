import { PortalShell } from '@/components/layout/portal-shell'
import { WorkerDashboard } from '@/components/worker/worker-dashboard'

const nav = [
  { href: '/worker/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/worker/dashboard', label: 'Tasks', icon: 'ListChecks' }
]

export default function WorkerDashboardPage() {
  return (
    <PortalShell title="Worker Dashboard" subtitle="Wash, iron, and dry clean queue" nav={nav}>
      <WorkerDashboard />
    </PortalShell>
  )
}
