import { Clock3, MapPin } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { assignmentCustomerName } from '@/lib/mappers'
import { formatBdt, statusLabel } from '@/lib/utils'
import type { Assignment } from '@/types'

type AssignmentCardProps = {
  assignment: Assignment
  onAccept?: (assignment: Assignment) => void
  onStart?: (assignment: Assignment) => void
  onComplete?: (assignment: Assignment) => void
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: (assignment: Assignment) => void
}

export function AssignmentCard({
  assignment,
  onAccept,
  onStart,
  onComplete,
  selectable,
  selected,
  onToggleSelect
}: AssignmentCardProps) {
  const canAccept = assignment.status === 'pending'
  const canStart = assignment.status === 'pending' || assignment.status === 'accepted'
  const canComplete = assignment.status === 'accepted' || assignment.status === 'in_progress'

  return (
    <article
      className={`rounded-lg border bg-white p-5 shadow-soft transition ${
        selected ? 'border-ironman-red ring-2 ring-ironman-red/30' : 'border-ironman-navy-100'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {selectable ? (
            <label className="mt-1 inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={!!selected}
                onChange={() => onToggleSelect?.(assignment)}
                aria-label={`Select ${assignment.orderNumber}`}
                className="h-5 w-5 rounded border-ironman-navy-100 text-ironman-red focus-ring"
              />
            </label>
          ) : null}
          <div>
            <p className="text-sm font-semibold text-ironman-red">{statusLabel(assignment.assignmentType as never)}</p>
            <h2 className="mt-1 text-lg font-bold text-ironman-navy">{assignment.orderNumber}</h2>
            <p className="mt-1 text-sm text-gray-600">{assignmentCustomerName(assignment)}</p>
          </div>
        </div>
        <StatusBadge status={assignment.status} />
      </div>
      <div className="mt-4 space-y-3 text-sm text-gray-600">
        <p className="flex gap-2">
          <MapPin className="h-5 w-5 shrink-0 text-ironman-red" aria-hidden />
          {assignment.address ?? 'Warehouse'}
        </p>
        <p className="flex gap-2">
          <Clock3 className="h-5 w-5 shrink-0 text-ironman-red" aria-hidden />
          {assignment.preferredTime ?? new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeZone: 'Asia/Dhaka' }).format(new Date(assignment.assignedAt ?? Date.now()))}
        </p>
      </div>
      {assignment.amountDue ? (
        <p className="mt-4 rounded-lg bg-ironman-navy-50 px-3 py-2 text-sm font-semibold text-ironman-navy">
          COD due: {formatBdt(assignment.amountDue)}
        </p>
      ) : null}
      <div className="mt-5 grid grid-cols-3 gap-2">
        <button className="tap-target focus-ring rounded-lg border border-ironman-navy px-3 py-2 text-sm font-semibold text-ironman-navy disabled:opacity-60" type="button" onClick={() => onAccept?.(assignment)} disabled={!onAccept || !canAccept}>
          Accept
        </button>
        <button className="tap-target focus-ring rounded-lg bg-ironman-navy px-3 py-2 text-sm font-semibold text-white disabled:opacity-60" type="button" onClick={() => onStart?.(assignment)} disabled={!onStart || !canStart}>
          Start
        </button>
        <button className="tap-target focus-ring rounded-lg bg-ironman-red px-3 py-2 text-sm font-semibold text-white disabled:opacity-60" type="button" onClick={() => onComplete?.(assignment)} disabled={!onComplete || !canComplete}>
          Done
        </button>
      </div>
    </article>
  )
}
