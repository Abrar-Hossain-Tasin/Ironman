'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlarmClock, ArrowDown } from 'lucide-react'
import { toast } from 'sonner'
import { RequireAuth } from '@/components/auth/require-auth'
import { AssignmentCard } from '@/components/tasks/assignment-card'
import { CompleteAssignmentPanel } from '@/components/tasks/complete-assignment-panel'
import { WorkerBatchBar } from '@/components/worker/worker-batch-bar'
import { CardSkeleton } from '@/components/ui/skeleton'
import { apiFetch, ApiError } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { cn, statusLabel } from '@/lib/utils'
import type { Assignment, AssignmentStatus, AssignmentType } from '@/types'

const STATION_ORDER: AssignmentType[] = ['wash', 'iron', 'dry_clean']

// Lower rank = surface earlier in the queue. The intent is "what should I
// grab next?": unaccepted work first, then accepted-but-not-started, then
// already-running. Terminal states sink to the bottom.
const STATUS_RANK: Record<AssignmentStatus, number> = {
  pending: 0,
  accepted: 1,
  in_progress: 2,
  completed: 3,
  rejected: 4
}

type AgeLevel = 'fresh' | 'aging' | 'urgent'

// Without a per-task SLA field on the backend, age-since-assigned is the
// best urgency proxy. Tune these thresholds in one place if production
// data shows different breakpoints.
function ageLevelFromMinutes(min: number): AgeLevel {
  if (min < 60) return 'fresh'
  if (min < 240) return 'aging'
  return 'urgent'
}

function ageMinutes(assignedAt: string | null | undefined, now: number): number {
  if (!assignedAt) return 0
  const parsed = new Date(assignedAt).getTime()
  if (Number.isNaN(parsed)) return 0
  return Math.max(0, Math.floor((now - parsed) / 60000))
}

function formatAge(min: number): string {
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hours = Math.floor(min / 60)
  if (hours < 24) {
    const remMin = min - hours * 60
    return remMin > 0 ? `${hours}h ${remMin}m ago` : `${hours}h ago`
  }
  return `${Math.floor(hours / 24)}d ago`
}

function compareForQueue(a: Assignment, b: Assignment): number {
  const rankDiff = STATUS_RANK[a.status] - STATUS_RANK[b.status]
  if (rankDiff !== 0) return rankDiff
  // Oldest assignment first within the same status so SLA pressure rises naturally.
  const ta = a.assignedAt ? new Date(a.assignedAt).getTime() : 0
  const tb = b.assignedAt ? new Date(b.assignedAt).getTime() : 0
  return ta - tb
}

const AGE_BADGE_CLASS: Record<AgeLevel, string> = {
  fresh: 'bg-ironman-navy-50 text-ironman-navy/80',
  aging: 'bg-amber-100 text-amber-800',
  urgent: 'bg-ironman-red-50 text-ironman-red-dark'
}

const AGE_BADGE_LABEL: Record<AgeLevel, string> = {
  fresh: 'Fresh',
  aging: 'Aging',
  urgent: 'Urgent'
}

function PriorityHeader({
  age,
  level,
  isNextUp
}: {
  age: number
  level: AgeLevel
  isNextUp: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
          AGE_BADGE_CLASS[level]
        )}
      >
        <AlarmClock className="h-3 w-3" aria-hidden />
        {AGE_BADGE_LABEL[level]} · {formatAge(age)}
      </span>
      {isNextUp ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-ironman-red px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white shadow-soft">
          <ArrowDown className="h-3 w-3" aria-hidden />
          Next up
        </span>
      ) : null}
    </div>
  )
}

export function WorkerDashboard() {
  const token = useAuthStore((state) => state.accessToken)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function load() {
    if (!token) return
    const data = await apiFetch<Assignment[]>('/worker/assignments', { token })
    setAssignments(data)
  }

  useEffect(() => {
    setLoading(true)
    void load()
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load tasks'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    if (message) toast.success(message)
  }, [message])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  const groups = useMemo(() => {
    const now = Date.now()
    const grouped = new Map<AssignmentType, Assignment[]>()
    for (const assignment of assignments) {
      const type = assignment.assignmentType
      if (!STATION_ORDER.includes(type)) continue
      const bucket = grouped.get(type) ?? []
      bucket.push(assignment)
      grouped.set(type, bucket)
    }
    return STATION_ORDER.map((type) => {
      const items = (grouped.get(type) ?? []).slice().sort(compareForQueue)
      // "Next up" = first item not already in progress, in queue order.
      const nextUpId = items.find((a) => a.status === 'pending' || a.status === 'accepted')?.id ?? null
      return { type, items, nextUpId, now }
    }).filter((group) => group.items.length > 0)
  }, [assignments])

  const selectedAssignments = useMemo(
    () => assignments.filter((assignment) => selectedIds.has(assignment.id)),
    [assignments, selectedIds]
  )

  function toggleSelect(assignment: Assignment) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(assignment.id)) {
        next.delete(assignment.id)
      } else {
        next.add(assignment.id)
      }
      return next
    })
  }

  function selectAllInGroup(items: Assignment[]) {
    setSelectedIds((current) => {
      const next = new Set(current)
      const selectable = items.filter((item) => item.status !== 'completed' && item.status !== 'rejected')
      const allSelected = selectable.every((item) => next.has(item.id))
      if (allSelected) {
        for (const item of selectable) next.delete(item.id)
      } else {
        for (const item of selectable) next.add(item.id)
      }
      return next
    })
  }

  async function action(assignment: Assignment, path: 'start') {
    if (!token) return
    try {
      await apiFetch(`/worker/assignments/${assignment.id}/${path}`, {
        method: 'PUT',
        token
      })
      setMessage(`${assignment.orderNumber} started`)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.message : err instanceof Error ? err.message : 'Could not start task')
    }
  }

  if (loading) {
    return (
      <RequireAuth roles={['wash_man', 'iron_man', 'dry_clean_man']}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </RequireAuth>
    )
  }

  return (
    <RequireAuth roles={['wash_man', 'iron_man', 'dry_clean_man']}>
      {groups.length === 0 ? (
        <p className="rounded-lg bg-white p-5 text-sm font-semibold text-ironman-navy shadow-soft">
          No active tasks. New work will appear here as soon as an order is assigned to you.
        </p>
      ) : null}

      <div className="space-y-8">
        {groups.map((group) => {
          const selectableIds = group.items
            .filter((item) => item.status !== 'completed' && item.status !== 'rejected')
            .map((item) => item.id)
          const allSelected =
            selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id))
          return (
            <section key={group.type}>
              <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-ironman-navy">{statusLabel(group.type)} station</h2>
                  <p className="text-xs text-gray-600">
                    {group.items.length} task{group.items.length === 1 ? '' : 's'} ·{' '}
                    {group.items.filter((i) => i.status === 'in_progress').length} in progress
                  </p>
                </div>
                {selectableIds.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => selectAllInGroup(group.items)}
                    className="focus-ring rounded-md px-2 py-1 text-xs font-semibold text-ironman-red hover:bg-ironman-red-50"
                  >
                    {allSelected ? 'Clear selection' : `Select all (${selectableIds.length})`}
                  </button>
                ) : null}
              </header>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {group.items.map((assignment) => {
                  const isOpen = expandedId === assignment.id
                  const age = ageMinutes(assignment.assignedAt, group.now)
                  const level = ageLevelFromMinutes(age)
                  const isNextUp = group.nextUpId === assignment.id
                  return (
                    <div
                      key={assignment.id}
                      className={cn(
                        'space-y-2 rounded-xl transition',
                        isNextUp && 'p-2 -m-2 bg-ironman-red-50/40 ring-1 ring-ironman-red/15'
                      )}
                    >
                      <PriorityHeader age={age} level={level} isNextUp={isNextUp} />
                      <AssignmentCard
                        assignment={assignment}
                        selectable
                        selected={selectedIds.has(assignment.id)}
                        onToggleSelect={toggleSelect}
                        onStart={(item) => action(item, 'start')}
                        onComplete={() => setExpandedId(isOpen ? null : assignment.id)}
                      />
                      {isOpen ? (
                        <CompleteAssignmentPanel
                          assignment={assignment}
                          token={token}
                          endpointBase="/worker"
                          title="Complete with photo evidence"
                          hint="Capture a photo at the station before passing the order to the next stage."
                          onCompleted={() => {
                            setMessage(`${assignment.orderNumber} marked complete`)
                            setExpandedId(null)
                            void load()
                          }}
                        />
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      <WorkerBatchBar
        selected={selectedAssignments}
        token={token}
        onClearSelection={() => setSelectedIds(new Set())}
        onChanged={() => {
          void load()
        }}
      />
    </RequireAuth>
  )
}
