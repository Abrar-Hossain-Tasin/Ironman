'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminLiveLocations } from '@/components/admin/admin-live-locations'
import { RequireAuth } from '@/components/auth/require-auth'
import { AssignmentCard } from '@/components/tasks/assignment-card'
import { TableSkeleton } from '@/components/ui/skeleton'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import type { Assignment } from '@/types'

export function AdminAssignments() {
  const token = useAuthStore((state) => state.accessToken)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)
    setError(null)
    apiFetch<Assignment[]>('/admin/assignments', { token })
      .then((rows) => {
        if (!cancelled) setAssignments(rows)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load assignments')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  return (
    <RequireAuth roles={['admin']}>
      <AdminLiveLocations />
      {loading ? (
        <TableSkeleton rows={6} />
      ) : assignments.length === 0 ? (
        <p className="rounded-lg bg-white p-5 text-sm font-semibold text-ironman-navy shadow-soft">
          No active assignments right now. New work appears here as orders are assigned to staff.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {assignments.map((assignment) => <AssignmentCard key={assignment.id} assignment={assignment} />)}
        </div>
      )}
    </RequireAuth>
  )
}
