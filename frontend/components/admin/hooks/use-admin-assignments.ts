'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import type { Assignment, UserSummary } from '@/types'

export const adminAssignmentsKeys = {
  all: ['admin', 'assignments'] as const,
  list: () => ['admin', 'assignments', 'list'] as const,
  staff: (role?: string) => ['admin', 'staff', role ?? 'all'] as const
}

export function useAdminAssignments() {
  const token = useAuthStore((s) => s.accessToken)
  return useQuery<Assignment[]>({
    queryKey: adminAssignmentsKeys.list(),
    enabled: Boolean(token),
    queryFn: () => apiFetch<Assignment[]>('/admin/assignments')
  })
}

export function useAdminStaff(role?: string) {
  const token = useAuthStore((s) => s.accessToken)
  return useQuery<UserSummary[]>({
    queryKey: adminAssignmentsKeys.staff(role),
    enabled: Boolean(token),
    queryFn: () => apiFetch<UserSummary[]>(role ? `/admin/staff?role=${role}` : '/admin/staff')
  })
}

export function useAssignOrder() {
  const qc = useQueryClient()
  return useMutation<
    Assignment,
    Error,
    {
      orderId: string
      assignmentType: 'pickup' | 'delivery' | 'wash' | 'iron' | 'dry_clean'
      assignedToId: string
      notes?: string | null
    }
  >({
    mutationFn: ({ orderId, assignmentType, assignedToId, notes }) =>
      apiFetch<Assignment>(`/admin/orders/${orderId}/assign`, {
        method: 'POST',
        // Backend AssignmentRequest expects `assignedTo` (the UUID field).
        body: { assignedTo: assignedToId, assignmentType, notes: notes ?? null }
      }),
    onSuccess: () => {
      toast.success('Driver assigned.')
      void qc.invalidateQueries({ queryKey: adminAssignmentsKeys.all })
      void qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
    },
    onError: (error) => {
      toast.error(error.message || 'Could not assign driver.')
    }
  })
}
