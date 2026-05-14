'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { LockKeyhole } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch, ApiError } from '@/lib/api'

export function ResetPasswordView() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (newPassword !== confirm) {
      toast.error('Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setSubmitting(true)
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: { email, code, newPassword }
      })
      toast.success('Password updated. You can now sign in.')
      router.push('/login?reset=1')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail || err.message : 'Could not reset password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ironman-navy-50/40 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-ironman-navy-100 bg-white p-8 shadow-luxury">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-ironman-red-50 text-ironman-red">
          <LockKeyhole className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="mt-5 text-center text-2xl font-bold text-ironman-navy">Set a new password</h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter the 6-digit code we emailed you, then choose a new password.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-xs font-bold uppercase tracking-wide text-ironman-navy">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-xl border border-ironman-navy-100 bg-white px-4 py-3 text-sm text-ironman-navy outline-none focus:border-ironman-red"
            />
          </label>
          <label className="block text-xs font-bold uppercase tracking-wide text-ironman-navy">
            Reset code
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className="mt-2 w-full rounded-xl border border-ironman-navy-100 bg-white px-4 py-3 text-center text-xl font-bold tracking-[0.5em] text-ironman-navy outline-none focus:border-ironman-red"
            />
          </label>
          <label className="block text-xs font-bold uppercase tracking-wide text-ironman-navy">
            New password
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-2 w-full rounded-xl border border-ironman-navy-100 bg-white px-4 py-3 text-sm text-ironman-navy outline-none focus:border-ironman-red"
            />
          </label>
          <label className="block text-xs font-bold uppercase tracking-wide text-ironman-navy">
            Confirm new password
            <input
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-2 w-full rounded-xl border border-ironman-navy-100 bg-white px-4 py-3 text-sm text-ironman-navy outline-none focus:border-ironman-red"
            />
          </label>

          <button
            type="submit"
            disabled={submitting || code.length !== 6 || !newPassword || !confirm}
            className="focus-ring inline-flex w-full items-center justify-center rounded-xl bg-ironman-red px-4 py-3 text-sm font-bold text-white shadow-glow transition hover:bg-ironman-red-dark disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Update password'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-500">
          Didn’t get a code?{' '}
          <Link href="/forgot-password" className="font-bold text-ironman-navy hover:text-ironman-red">
            Request a new one
          </Link>
        </p>
      </div>
    </main>
  )
}
