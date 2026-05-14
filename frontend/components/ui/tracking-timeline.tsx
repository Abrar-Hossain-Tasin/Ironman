import { Check } from 'lucide-react'
import type { OrderStatus, TrackingEvent } from '@/types'
import { lifecycle } from '@/lib/statuses'
import { cn, statusLabel } from '@/lib/utils'

type TrackingTimelineProps = {
  events: TrackingEvent[]
}

export function TrackingTimeline({ events }: TrackingTimelineProps) {
  const completed = new Set(events.map((event) => event.status))
  const activeStatus = events.at(-1)?.status ?? 'pending'

  return (
    <div className="space-y-0">
      {lifecycle.map((status, index) => {
        const event = events.find((item) => item.status === status)
        const isComplete = completed.has(status) && status !== activeStatus
        const isActive = status === activeStatus
        const isPending = !event && !isActive

        return (
          <div key={status} className="grid grid-cols-[34px_1fr] gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'mt-1 flex h-8 w-8 items-center justify-center rounded-full border-2',
                  isComplete && 'border-ironman-navy bg-ironman-navy text-white',
                  isActive && 'animate-pulse border-ironman-red bg-ironman-red text-white',
                  isPending && 'border-gray-300 bg-white text-gray-400'
                )}
              >
                {isComplete ? <Check className="h-4 w-4" aria-hidden /> : <span className="h-2 w-2 rounded-full bg-current" />}
              </div>
              {index < lifecycle.length - 1 ? <div className="min-h-12 w-px bg-ironman-navy-100" /> : null}
            </div>
            <div className="pb-6">
              <p className={cn('font-semibold', isActive ? 'text-ironman-red' : isPending ? 'text-gray-400' : 'text-ironman-navy')}>
                {event?.statusLabel ?? statusLabel(status as OrderStatus)}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {event?.description ?? (isActive ? 'In progress' : 'Waiting')}
              </p>
              {event ? (
                <p className="mt-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                  {new Intl.DateTimeFormat('en-BD', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                    timeZone: 'Asia/Dhaka'
                  }).format(new Date(event.timestamp))}{' '}
                  by {event.updatedByName}
                </p>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
