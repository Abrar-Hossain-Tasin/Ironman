'use client'

import { FormEvent, useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { RequireAuth } from '@/components/auth/require-auth'
import { apiFetch, ApiError } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import type { UserRole } from '@/types'

const AUDIENCES: { value: 'all' | UserRole; label: string; description: string }[] = [
  { value: 'all', label: 'Everyone', description: 'All active users — customers and staff' },
  { value: 'customer', label: 'Customers', description: 'Only customers' },
  { value: 'delivery_man', label: 'Delivery agents', description: 'Pickup & delivery staff' },
  { value: 'wash_man', label: 'Wash team', description: 'Wash station only' },
  { value: 'iron_man', label: 'Iron team', description: 'Iron station only' },
  { value: 'dry_clean_man', label: 'Dry clean team', description: 'Dry clean station only' }
]

export function AdminBroadcasts() {
  const token = useAuthStore((state) => state.accessToken)
  const [audience, setAudience] = useState<'all' | UserRole>('all')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return
    if (title.trim().length < 3 || body.trim().length < 5) {
      toast.error('Title and message are too short.')
      return
    }
    if (!confirm(`Send this broadcast to ${AUDIENCES.find((a) => a.value === audience)?.label}? Recipients will be notified immediately.`)) {
      return
    }
    setSubmitting(true)
    try {
      const result = await apiFetch<{ message: string }>('/admin/notifications/broadcast', {
        method: 'POST',
        token,
        body: {
          title: title.trim(),
          body: body.trim(),
          role: audience === 'all' ? null : audience
        }
      })
      toast.success(result.message)
      setTitle('')
      setBody('')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail || err.message : err instanceof Error ? err.message : 'Could not send broadcast')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <RequireAuth roles={['admin']}>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <form className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft" onSubmit={submit}>
          <h2 className="flex items-center gap-2 text-lg font-bold text-ironman-navy">
            <Send className="h-5 w-5 text-ironman-red" aria-hidden />
            Send broadcast
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Broadcasts hit every recipient's in-app inbox and any wired SMS / push channels.
          </p>

          <fieldset className="mt-4">
            <legend className="text-xs font-medium uppercase tracking-wide text-gray-500">Audience</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {AUDIENCES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAudience(option.value)}
                  className={`focus-ring rounded-lg border p-3 text-left text-sm transition ${
                    audience === option.value
                      ? 'border-ironman-red bg-white'
                      : 'border-ironman-navy-100 bg-white/70'
                  }`}
                >
                  <p className="font-semibold text-ironman-navy">{option.label}</p>
                  <p className="text-xs text-gray-600">{option.description}</p>
                </button>
              ))}
            </div>
          </fieldset>

          <label className="mt-4 block text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={120}
              placeholder="Service notice — Friday closure"
              className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
            />
          </label>

          <label className="mt-3 block text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Message</span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              required
              rows={4}
              maxLength={1000}
              placeholder="No pickups or deliveries this Friday for Eid. We'll resume Saturday morning."
              className="mt-1 w-full rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 text-sm focus-ring"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="tap-target focus-ring mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ironman-red px-4 py-2 font-semibold text-white disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
            {submitting ? 'Sending…' : 'Send broadcast'}
          </button>
        </form>

        <aside className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
          <h3 className="text-lg font-bold text-ironman-navy">Tips</h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            <li>· Use Customers audience for promotional notices — avoid notifying staff for marketing.</li>
            <li>· Use station audiences for shift changes or process updates.</li>
            <li>· There is no recall — double-check before sending. Each broadcast writes one notification row per recipient.</li>
            <li>· Heavy out-of-band channels (SMS, push) honour whichever provider is wired in <code>application.yaml</code>; in-app delivery is always best-effort.</li>
          </ul>
        </aside>
      </div>
    </RequireAuth>
  )
}
