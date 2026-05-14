'use client'

import { useEffect, useState } from 'react'
import { CheckCheck, Inbox } from 'lucide-react'
import { RequireAuth } from '@/components/auth/require-auth'
import { TableSkeleton } from '@/components/ui/skeleton'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { getSupabaseClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { NotificationResponse } from '@/types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

export function NotificationsView() {
  const token = useAuthStore((state) => state.accessToken)
  const userId = useAuthStore((state) => state.user?.id)
  const [items, setItems] = useState<NotificationResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  async function load() {
    if (!token) return
    try {
      const data = await apiFetch<NotificationResponse[]>('/notifications', { token })
      setItems(data ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [token])

  useEffect(() => {
    if (!token || !userId) return
    const client = getSupabaseClient()
    if (!client) return
    const channel = client
      .channel(`notifications-page-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => {
          void load()
        }
      )
      .subscribe()
    return () => {
      void client.removeChannel(channel)
    }
  }, [token, userId])

  async function markAll() {
    await apiFetch('/notifications/read-all', { method: 'PUT', token })
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  async function markOne(id: string) {
    await apiFetch(`/notifications/${id}/read`, { method: 'PUT', token })
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const filtered = filter === 'unread' ? items.filter((i) => !i.read) : items
  const unreadCount = items.filter((i) => !i.read).length

  return (
    <RequireAuth>
      <main className="container-page py-6">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ironman-red">Inbox</p>
            <h1 className="text-2xl font-bold text-ironman-navy">Notifications</h1>
            <p className="mt-1 text-sm text-gray-600">
              {unreadCount > 0 ? `${unreadCount} unread of ${items.length}` : `${items.length} total`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-ironman-navy-100 bg-white p-1">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-bold',
                  filter === 'all' ? 'bg-ironman-navy text-white' : 'text-ironman-navy'
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilter('unread')}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-bold',
                  filter === 'unread' ? 'bg-ironman-navy text-white' : 'text-ironman-navy'
                )}
              >
                Unread
              </button>
            </div>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={markAll}
                className="focus-ring inline-flex items-center gap-1 rounded-lg bg-ironman-red px-3 py-2 text-xs font-bold text-white shadow-glow hover:bg-ironman-red-dark"
              >
                <CheckCheck className="h-4 w-4" aria-hidden />
                Mark all read
              </button>
            ) : null}
          </div>
        </header>

        {loading ? (
          <TableSkeleton rows={5} />
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ironman-navy-100 bg-white px-6 py-16 text-center">
            <Inbox className="mx-auto h-10 w-10 text-ironman-navy-200" aria-hidden />
            <p className="mt-3 text-sm font-bold text-ironman-navy">No notifications</p>
            <p className="mt-1 text-xs text-gray-500">
              {filter === 'unread' ? 'You’re all caught up.' : 'You haven’t received any updates yet.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((item) => (
              <li
                key={item.id}
                className={cn(
                  'flex items-start gap-3 rounded-xl border bg-white p-4 shadow-soft transition',
                  item.read
                    ? 'border-ironman-navy-100'
                    : 'border-ironman-red-100 bg-ironman-red-50/30'
                )}
              >
                <span
                  className={cn(
                    'mt-1 h-2.5 w-2.5 shrink-0 rounded-full',
                    item.read ? 'bg-ironman-navy-100' : 'bg-ironman-red'
                  )}
                  aria-hidden
                />
                <div className="flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-bold text-ironman-navy">{item.title}</p>
                    <p className="text-xs text-gray-500">{formatDate(item.createdAt)}</p>
                  </div>
                  <p className="mt-1 text-sm text-gray-700">{item.body}</p>
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-ironman-navy-200">
                    {item.type.replace(/_/g, ' ')}
                  </p>
                </div>
                {!item.read ? (
                  <button
                    type="button"
                    onClick={() => markOne(item.id)}
                    className="focus-ring shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-ironman-red hover:bg-ironman-red-50"
                  >
                    Mark read
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </main>
    </RequireAuth>
  )
}
