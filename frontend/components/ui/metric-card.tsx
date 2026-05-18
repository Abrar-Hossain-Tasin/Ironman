import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

type Trend = {
  label: string
  direction?: 'up' | 'down' | 'flat'
  intent?: 'positive' | 'negative' | 'neutral'
}

type MetricCardProps = {
  label: string
  value: string
  icon: string
  tone?: 'navy' | 'red' | 'plain'
  hint?: string
  trend?: Trend
}

const trendIntentClasses: Record<NonNullable<Trend['intent']>, string> = {
  positive: 'text-green-700 bg-green-50',
  negative: 'text-ironman-red bg-ironman-red-50',
  neutral: 'text-gray-600 bg-ironman-navy-50'
}

export function MetricCard({ label, value, icon, tone = 'plain', hint, trend }: MetricCardProps) {
  const TrendIcon = trend?.direction === 'down' ? ArrowDownRight : trend?.direction === 'flat' ? Minus : ArrowUpRight
  const intent = trend?.intent ?? 'neutral'

  return (
    <div className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-2 break-words text-2xl font-bold text-ironman-navy">{value}</p>
          {(hint || trend) && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {trend && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
                    trendIntentClasses[intent]
                  )}
                >
                  <TrendIcon className="h-3 w-3" aria-hidden />
                  {trend.label}
                </span>
              )}
              {hint && <span className="text-xs text-gray-500">{hint}</span>}
            </div>
          )}
        </div>
        <div
          className={cn(
            'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg',
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
