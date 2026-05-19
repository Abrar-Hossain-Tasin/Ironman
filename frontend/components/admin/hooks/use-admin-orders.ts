'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import type { OrderResponse, OrderStatus } from '@/types'

type OrdersFilter = {
  status?: OrderStatus | ''
}

// Centralised query keys so mutations can invalidate the same scope. Keep
// these flat — TanStack Query matches by key prefix.
export const adminOrdersKeys = {
  all: ['admin', 'orders'] as const,
  list: (filter: OrdersFilter) => ['admin', 'orders', 'list', filter] as const
}

export function useAdminOrders(filter: OrdersFilter = {}) {
  const token = useAuthStore((s) => s.accessToken)
  return useQuery<OrderResponse[]>({
    queryKey: adminOrdersKeys.list(filter),
    enabled: Boolean(token),
    queryFn: () => {
      const path = filter.status ? `/admin/orders?status=${filter.status}` : '/admin/orders'
      return apiFetch<OrderResponse[]>(path)
    }
  })
}

// Optimistic status update — flips the order in-cache before the API confirms.
// Rolls back on error and re-fetches on settle so we eventually converge with
// the server even if the optimistic shape drifted (e.g. server updated other
// fields as a side-effect of the status change).
export function useUpdateOrderStatus() {
  const qc = useQueryClient()
  return useMutation<
    OrderResponse,
    Error,
    { id: string; status: OrderStatus; reason?: string },
    { snapshots: Array<[readonly unknown[], OrderResponse[] | undefined]> }
  >({
    mutationFn: ({ id, status, reason }) =>
      apiFetch<OrderResponse>(`/admin/orders/${id}/status`, {
        method: 'PUT',
        body: { status, reason: reason ?? null }
      }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: adminOrdersKeys.all })
      const snapshots = qc.getQueriesData<OrderResponse[]>({ queryKey: adminOrdersKeys.all })
      for (const [key, data] of snapshots) {
        if (!data) continue
        qc.setQueryData<OrderResponse[]>(
          key as readonly unknown[],
          data.map((order) => (order.id === id ? { ...order, status } : order))
        )
      }
      return { snapshots }
    },
    onError: (error, _vars, ctx) => {
      // Roll back every cache slice we optimistically patched.
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key as readonly unknown[], data))
      toast.error(error.message || 'Could not update order status.')
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: adminOrdersKeys.all })
    }
  })
}
