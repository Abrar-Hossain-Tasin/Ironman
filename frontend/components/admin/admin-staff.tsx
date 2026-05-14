'use client'

import { FormEvent, useEffect, useState } from 'react'
import { KeyRound, Pencil, Power, PowerOff, Star, X } from 'lucide-react'
import { toast } from 'sonner'
import { RequireAuth } from '@/components/auth/require-auth'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { apiFetch, ApiError } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { statusLabel } from '@/lib/utils'
import type { ReviewResponse, UserRole, UserSummary } from '@/types'

const STAFF_ROLES: UserRole[] = ['delivery_man', 'wash_man', 'iron_man', 'dry_clean_man']

type StaffDraft = {
  fullName: string
  email: string
  phone: string
  role: UserRole
  active: boolean
}

export function AdminStaff() {
  const token = useAuthStore((state) => state.accessToken)
  const [staff, setStaff] = useState<UserSummary[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<UserSummary | null>(null)
  const [reviews, setReviews] = useState<ReviewResponse[]>([])
  const [rating, setRating] = useState<number | null>(null)
  const [reviewLoading, setReviewLoading] = useState(false)

  const [editing, setEditing] = useState<UserSummary | null>(null)
  const [draft, setDraft] = useState<StaffDraft | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  const [resetTarget, setResetTarget] = useState<UserSummary | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetSaving, setResetSaving] = useState(false)

  async function load() {
    if (!token) return
    try {
      setStaff(await apiFetch<UserSummary[]>('/admin/staff', { token }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load staff')
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    if (message) toast.success(message)
  }, [message])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  useEffect(() => {
    if (!token || !selected) {
      setReviews([])
      setRating(null)
      return
    }
    let cancelled = false
    setReviewLoading(true)
    Promise.all([
      apiFetch<ReviewResponse[]>(`/admin/staff/${selected.id}/reviews`, { token }),
      apiFetch<number | null>(`/admin/staff/${selected.id}/rating`, { token }).catch(() => null)
    ])
      .then(([list, avg]) => {
        if (cancelled) return
        setReviews(list)
        setRating(avg)
      })
      .finally(() => {
        if (!cancelled) setReviewLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, selected])

  function flashMessage(text: string) {
    setMessage(text)
    setError(null)
    window.setTimeout(() => setMessage((current) => (current === text ? null : current)), 3500)
  }

  async function createStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return
    const form = new FormData(event.currentTarget)
    try {
      await apiFetch<UserSummary>('/auth/admin/create-staff', {
        method: 'POST',
        token,
        body: {
          fullName: String(form.get('fullName') ?? ''),
          email: String(form.get('email') ?? ''),
          phone: String(form.get('phone') ?? ''),
          password: String(form.get('password') ?? ''),
          role: String(form.get('role') ?? 'delivery_man') as UserRole
        }
      })
      flashMessage('Staff account created')
      event.currentTarget.reset()
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.message : err instanceof Error ? err.message : 'Could not create staff')
    }
  }

  function openEdit(person: UserSummary) {
    setEditing(person)
    setDraft({
      fullName: person.fullName,
      email: person.email,
      phone: person.phone,
      role: person.role,
      active: person.active
    })
    setError(null)
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token || !editing || !draft) return
    setSavingEdit(true)
    setError(null)
    try {
      const updated = await apiFetch<UserSummary>(`/auth/admin/staff/${editing.id}`, {
        method: 'PUT',
        token,
        body: draft
      })
      setStaff((current) => current.map((row) => (row.id === updated.id ? updated : row)))
      setEditing(null)
      setDraft(null)
      flashMessage('Staff updated')
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.message : err instanceof Error ? err.message : 'Could not update staff')
    } finally {
      setSavingEdit(false)
    }
  }

  async function toggleActive(person: UserSummary) {
    if (!token) return
    const goingInactive = person.active
    if (goingInactive && !window.confirm(`Deactivate ${person.fullName}? They won't be able to log in.`)) {
      return
    }
    try {
      const updated = goingInactive
        ? await apiFetch<UserSummary>(`/auth/admin/staff/${person.id}`, { method: 'DELETE', token })
        : await apiFetch<UserSummary>(`/auth/admin/staff/${person.id}/activate`, { method: 'PUT', token })
      setStaff((current) => current.map((row) => (row.id === updated.id ? updated : row)))
      flashMessage(`${person.fullName} ${goingInactive ? 'deactivated' : 'activated'}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.message : err instanceof Error ? err.message : 'Could not toggle staff')
    }
  }

  function openReset(person: UserSummary) {
    setResetTarget(person)
    setResetPassword('')
    setError(null)
  }

  async function submitReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token || !resetTarget) return
    if (resetPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    setResetSaving(true)
    setError(null)
    try {
      await apiFetch(`/auth/admin/staff/${resetTarget.id}/reset-password`, {
        method: 'PUT',
        token,
        body: { newPassword: resetPassword }
      })
      flashMessage(`Password reset for ${resetTarget.fullName}. Share securely.`)
      setResetTarget(null)
      setResetPassword('')
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.message : err instanceof Error ? err.message : 'Could not reset password')
    } finally {
      setResetSaving(false)
    }
  }

  return (
    <RequireAuth roles={['admin']}>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {staff.map((person) => (
              <article
                key={person.id}
                className={`rounded-lg border bg-white p-5 shadow-soft ${
                  person.active ? 'border-ironman-navy-100' : 'border-gray-200 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-ironman-navy">{person.fullName}</h2>
                    <p className="mt-1 text-sm text-gray-600">{statusLabel(person.role)}</p>
                    <p className="mt-1 text-sm text-gray-600">{person.email}</p>
                    <p className="text-xs text-gray-500">{person.phone}</p>
                  </div>
                  <StatusBadge status={person.active ? 'accepted' : 'rejected'} />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(person)}
                    className="focus-ring inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-ironman-navy hover:bg-ironman-navy-50"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => openReset(person)}
                    className="focus-ring inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-ironman-navy hover:bg-ironman-navy-50"
                  >
                    <KeyRound className="h-3.5 w-3.5" aria-hidden /> Reset password
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(person)}
                    className={`focus-ring inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${
                      person.active
                        ? 'text-ironman-red hover:bg-ironman-red-50'
                        : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    {person.active ? (
                      <>
                        <PowerOff className="h-3.5 w-3.5" aria-hidden /> Deactivate
                      </>
                    ) : (
                      <>
                        <Power className="h-3.5 w-3.5" aria-hidden /> Activate
                      </>
                    )}
                  </button>
                  {person.role === 'delivery_man' ? (
                    <button
                      type="button"
                      onClick={() => setSelected((current) => (current?.id === person.id ? null : person))}
                      className="focus-ring inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-ironman-red hover:bg-ironman-red-50"
                    >
                      <Star className="h-3.5 w-3.5" aria-hidden />
                      {selected?.id === person.id ? 'Hide reviews' : 'Reviews'}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          {selected ? (
            <section className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
              <header className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-ironman-navy">Reviews — {selected.fullName}</h3>
                  <p className="text-xs text-gray-500">
                    {reviews.length} review{reviews.length === 1 ? '' : 's'}
                  </p>
                </div>
                {rating != null ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800">
                    <Star className="h-4 w-4" aria-hidden />
                    {rating.toFixed(2)} / 5
                  </span>
                ) : null}
              </header>

              {reviewLoading ? (
                <div className="mt-4 space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : reviews.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">No reviews yet.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {reviews.map((review) => (
                    <li key={review.id} className="rounded-lg border border-ironman-navy-100 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-ironman-navy">{review.customerName}</p>
                        <span className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                          <Star className="h-4 w-4" aria-hidden />
                          {review.overallRating} / 5
                        </span>
                        {review.serviceRating ? <span>Service {review.serviceRating}/5</span> : null}
                        {review.deliveryRating ? <span>Delivery {review.deliveryRating}/5</span> : null}
                      </div>
                      {review.comment ? <p className="mt-2 text-sm text-gray-700">{review.comment}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </div>

        <form className="h-fit rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft" onSubmit={createStaff}>
          <h2 className="text-xl font-bold text-ironman-navy">Create staff</h2>
          <div className="mt-4 space-y-3">
            <input
              name="fullName"
              className="tap-target w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
              placeholder="Full name"
              required
            />
            <input
              name="email"
              className="tap-target w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
              placeholder="Email"
              type="email"
              required
            />
            <input
              name="phone"
              className="tap-target w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
              placeholder="Phone"
              required
            />
            <input
              name="password"
              className="tap-target w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
              placeholder="Initial password"
              type="password"
              minLength={8}
              required
            />
            <select
              name="role"
              className="tap-target w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
              defaultValue="delivery_man"
            >
              {STAFF_ROLES.map((role) => (
                <option key={role} value={role}>
                  {statusLabel(role)}
                </option>
              ))}
            </select>
          </div>
          <button className="tap-target mt-4 w-full rounded-lg bg-ironman-red px-4 py-2 font-semibold text-white" type="submit">
            Create
          </button>
        </form>
      </div>

      {editing && draft ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-ironman-navy-100 px-5 py-3">
              <h3 className="text-lg font-bold text-ironman-navy">Edit {editing.fullName}</h3>
              <button
                type="button"
                onClick={() => {
                  setEditing(null)
                  setDraft(null)
                }}
                aria-label="Close"
                className="focus-ring rounded-full p-1 text-ironman-navy"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <form onSubmit={saveEdit} className="space-y-3 p-5">
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Full name</span>
                <input
                  className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
                  value={draft.fullName}
                  onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
                  required
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Email</span>
                <input
                  type="email"
                  className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
                  value={draft.email}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                  required
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Phone</span>
                <input
                  className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
                  value={draft.phone}
                  onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                  required
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Role</span>
                <select
                  className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
                  value={draft.role}
                  onChange={(e) => setDraft({ ...draft, role: e.target.value as UserRole })}
                >
                  {STAFF_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {statusLabel(role)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-ironman-navy">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                  className="h-4 w-4 accent-ironman-red"
                />
                Active (can log in)
              </label>
              <div className="flex items-center justify-end gap-2 border-t border-ironman-navy-100 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null)
                    setDraft(null)
                  }}
                  className="tap-target rounded-lg border border-ironman-navy-100 bg-white px-4 py-2 text-sm font-semibold text-ironman-navy"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="tap-target rounded-lg bg-ironman-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {savingEdit ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {resetTarget ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-ironman-navy-100 px-5 py-3">
              <h3 className="text-lg font-bold text-ironman-navy">Reset password — {resetTarget.fullName}</h3>
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                aria-label="Close"
                className="focus-ring rounded-full p-1 text-ironman-navy"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <form onSubmit={submitReset} className="space-y-3 p-5">
              <p className="text-sm text-gray-600">
                Type a new password. Share it with the staff member through a secure channel — they should change it on next sign-in.
              </p>
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">New password</span>
                <input
                  type="password"
                  minLength={8}
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
                  required
                />
              </label>
              <div className="flex items-center justify-end gap-2 border-t border-ironman-navy-100 pt-3">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="tap-target rounded-lg border border-ironman-navy-100 bg-white px-4 py-2 text-sm font-semibold text-ironman-navy"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetSaving}
                  className="tap-target rounded-lg bg-ironman-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {resetSaving ? 'Resetting…' : 'Reset password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </RequireAuth>
  )
}
