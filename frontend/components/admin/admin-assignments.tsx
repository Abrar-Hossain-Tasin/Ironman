'use client'

import { useEffect, useState } from 'react'
import { AdminLiveLocations } from '@/components/admin/admin-live-locations'
import { RequireAuth } from '@/components/auth/require-auth'
import { AssignmentCard } from '@/components/tasks/assignment-card'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import type { Assignment } from '@/types'

export function AdminAssignments() {
  const token = useAuthStore((state) => state.accessToken)
  const [assignments, setAssignments] = useState<Assignment[]>([])

  useEffect(() => {
    if (!token) return
    apiFetch<Assignment[]>('/admin/assignments', { token }).then(setAssignments)
  }, [token])

  return (
    <RequireAuth roles={['admin']}>
      <AdminLiveLocations />
      <div className="grid gap-4 md:grid-cols-3">
        {assignments.map((assignment) => <AssignmentCard key={assignment.id} assignment={assignment} />)}
      </div>
    </RequireAuth>
  )
}
