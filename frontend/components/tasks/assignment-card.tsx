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

type AssignmentAction = {
  label: string
  onClick: () => void
  disabled: boolean
  className: string
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
  const actions = [
    onAccept
      ? {
          label: 'Accept',
          onClick: () => onAccept(assignment),
          disabled: !canAccept,
          className: 'border border-ironman-navy bg-white text-ironman-navy'
        }
      : null,
    onStart
      ? {
          label: 'Start',
          onClick: () => onStart(assignment),
          disabled: !canStart,
          className: 'bg-ironman-navy text-white'
        }
      : null,
    onComplete
      ? {
          label: 'Done',
          onClick: () => onComplete(assignment),
          disabled: !canComplete,
          className: 'bg-ironman-red text-white'
        }
      : null
  ].filter((action): action is AssignmentAction => Boolean(action))

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
      {actions.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {actions.map((action) => (
            <button
              key={action.label}
              className={`tap-target focus-ring min-w-[6rem] flex-1 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-60 ${action.className}`}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </article>
  )
}
