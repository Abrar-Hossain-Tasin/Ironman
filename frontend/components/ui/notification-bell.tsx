'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  AlertOctagon,
  Bell,
  BellRing,
  Check,
  CheckCheck,
  CreditCard,
  PackageCheck,
  Receipt,
  Send,
  Star,
  Truck,
  WalletCards
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { getSupabaseClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { NotificationResponse } from '@/types'

// Pick an icon + tone for a notification by its `type` discriminator. Unknown
// types fall back to the generic bell — adding a new server-side type doesn't
// break the UI, it just looks generic until we add a row here.
function iconForType(type: string): { Icon: LucideIcon; tone: string } {
  const t = (type || '').toLowerCase()
  if (t.includes('cod') || t.includes('payment') || t.includes('paid')) return { Icon: WalletCards, tone: 'text-emerald-600 bg-emerald-50' }
  if (t.includes('receipt') || t.includes('invoice')) return { Icon: Receipt, tone: 'text-ironman-navy bg-ironman-navy-50' }
  if (t.includes('refund')) return { Icon: CreditCard, tone: 'text-amber-600 bg-amber-50' }
  if (t.includes('issue') || t.includes('dispute') || t.includes('damaged')) return { Icon: AlertOctagon, tone: 'text-ironman-red bg-ironman-red-50' }
  if (t.includes('review') || t.includes('rating')) return { Icon: Star, tone: 'text-amber-600 bg-amber-50' }
  if (t.includes('delivery') || t.includes('pickup') || t.includes('out_for')) return { Icon: Truck, tone: 'text-sky-600 bg-sky-50' }
  if (t.includes('order') || t.includes('ready') || t.includes('confirmed')) return { Icon: PackageCheck, tone: 'text-ironman-red bg-ironman-red-50' }
  if (t.includes('broadcast') || t.includes('announce')) return { Icon: Send, tone: 'text-ironman-navy bg-ironman-navy-50' }
  if (t.includes('alert') || t.includes('reminder')) return { Icon: BellRing, tone: 'text-amber-600 bg-amber-50' }
  return { Icon: Bell, tone: 'text-gray-500 bg-gray-50' }
}

const MAX_PANEL_ITEMS = 8

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export function NotificationBell() {
  const token = useAuthStore((state) => state.accessToken)
  const userId = useAuthStore((state) => state.user?.id)
  const [items, setItems] = useState<NotificationResponse[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  const unread = items.filter((item) => !item.read).length

  async function load() {
    if (!token) return
    setLoading(true)
    try {
      const data = await apiFetch<NotificationResponse[]>('/notifications', { token })
      setItems(data ?? [])
    } catch {
      // Silently ignore — the bell should never crash the shell.
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [token])

  // Realtime: subscribe to inserts/updates on `notifications` filtered by user_id.
  // Falls back to silent no-op when Supabase env vars are missing.
  useEffect(() => {
    if (!token || !userId) return
    const client = getSupabaseClient()
    if (!client) return

    const channel = client
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => {
          void load()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => {
          void load()
        }
      )
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  }, [token, userId])

  // Close on outside click.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!open) return
      const target = event.target as Node
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  async function markOne(id: string) {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PUT', token })
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    } catch {
      /* noop */
    }
  }

  async function markAll() {
    try {
      await apiFetch('/notifications/read-all', { method: 'PUT', token })
      setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch {
      /* noop */
    }
  }

  if (!token) return null

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `${unread} unread notifications` : 'Notifications'}
        aria-expanded={open}
        className="focus-ring relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-ironman-navy-100 bg-white text-ironman-navy transition hover:bg-ironman-navy-50"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unread > 0 ? (
          <span
            className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-ironman-red px-1 text-[11px] font-bold text-white shadow-glow"
            aria-hidden
          >
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-40 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] origin-top-right rounded-xl border border-ironman-navy-100 bg-white shadow-luxury"
        >
          <div className="flex items-center justify-between border-b border-ironman-navy-100 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-ironman-navy">Notifications</p>
              <p className="text-xs text-gray-500">
                {unread > 0 ? `${unread} unread` : 'All caught up'}
              </p>
            </div>
            {unread > 0 ? (
              <button
                type="button"
                onClick={markAll}
                className="focus-ring inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-ironman-red hover:bg-ironman-red-50"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden />
                Mark all read
              </button>
            ) : null}
          </div>

          <ul className="max-h-96 divide-y divide-ironman-navy-100 overflow-y-auto">
            {loading && items.length === 0 ? (
              <li className="space-y-3 px-4 py-5">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </li>
            ) : items.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-gray-500">
                You have no notifications yet.
              </li>
            ) : (
              items.slice(0, MAX_PANEL_ITEMS).map((item) => {
                const { Icon, tone } = iconForType(item.type)
                return (
                  <li
                    key={item.id}
                    className={cn('flex gap-3 px-4 py-3', !item.read && 'bg-ironman-navy-50/50')}
                  >
                    <div className={cn('mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full', tone)} aria-hidden>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-ironman-navy">{item.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">{item.body}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-wide text-gray-400">
                        {timeAgo(item.createdAt)}
                      </p>
                    </div>
                    {!item.read ? (
                      <button
                        type="button"
                        onClick={() => markOne(item.id)}
                        aria-label="Mark as read"
                        className="focus-ring shrink-0 self-start rounded-md p-1 text-gray-400 hover:bg-ironman-navy-50 hover:text-ironman-navy"
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    ) : null}
                  </li>
                )
              })
            )}
          </ul>

          <div className="border-t border-ironman-navy-100 px-4 py-2 text-center">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="focus-ring inline-block text-xs font-bold text-ironman-red hover:underline"
            >
              View all
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}
