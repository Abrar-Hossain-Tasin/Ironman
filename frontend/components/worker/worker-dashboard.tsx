'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RequireAuth } from '@/components/auth/require-auth'
import { AssignmentCard } from '@/components/tasks/assignment-card'
import { CompleteAssignmentPanel } from '@/components/tasks/complete-assignment-panel'
import { WorkerBatchBar } from '@/components/worker/worker-batch-bar'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { statusLabel } from '@/lib/utils'
import type { Assignment, AssignmentType } from '@/types'

const STATION_ORDER: AssignmentType[] = ['wash', 'iron', 'dry_clean']

export function WorkerDashboard() {
  const token = useAuthStore((state) => state.accessToken)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function load() {
    if (!token) return
    const data = await apiFetch<Assignment[]>('/worker/assignments', { token })
    setAssignments(data)
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    if (message) toast.success(message)
  }, [message])

  const groups = useMemo(() => {
    const grouped = new Map<AssignmentType, Assignment[]>()
    for (const assignment of assignments) {
      const type = assignment.assignmentType
      if (!STATION_ORDER.includes(type)) continue
      const bucket = grouped.get(type) ?? []
      bucket.push(assignment)
      grouped.set(type, bucket)
    }
    return STATION_ORDER.map((type) => ({
      type,
      items: grouped.get(type) ?? []
    })).filter((group) => group.items.length > 0)
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
    await apiFetch(`/worker/assignments/${assignment.id}/${path}`, {
      method: 'PUT',
      token
    })
    setMessage(`${assignment.orderNumber} started`)
    await load()
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
                  return (
                    <div key={assignment.id} className="space-y-2">
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
