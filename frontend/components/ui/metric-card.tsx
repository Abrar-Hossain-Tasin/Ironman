import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

type MetricCardProps = {
  label: string
  value: string
  icon: string
  tone?: 'navy' | 'red' | 'plain'
}

export function MetricCard({ label, value, icon, tone = 'plain' }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-ironman-navy">{value}</p>
        </div>
        <div
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-lg',
            tone === 'navy' && 'bg-ironman-navy text-white',
            tone === 'red' && 'bg-ironman-red text-white',
            tone === 'plain' && 'bg-ironman-navy-50 text-ironman-navy'
          )}
        >
          <Icon name={icon} className="h-5 w-5" aria-hidden />
        </div>
      </div>
    </div>
  )
}
