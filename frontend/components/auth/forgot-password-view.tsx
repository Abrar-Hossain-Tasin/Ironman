'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch, ApiError } from '@/lib/api'

export function ForgotPasswordView() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await apiFetch('/auth/forgot-password', { method: 'POST', body: { email } })
      toast.success('If an account exists for that email, a reset code is on its way.')
      window.setTimeout(() => {
        router.push(`/reset-password?email=${encodeURIComponent(email)}`)
      }, 1200)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail || err.message : 'Could not send reset code')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ironman-navy-50/40 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-ironman-navy-100 bg-white p-8 shadow-luxury">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-ironman-red-50 text-ironman-red">
          <KeyRound className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="mt-5 text-center text-2xl font-bold text-ironman-navy">Forgot your password?</h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter the email tied to your account. We’ll send a 6-digit reset code.
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

          <button
            type="submit"
            disabled={submitting || !email}
            className="focus-ring inline-flex w-full items-center justify-center rounded-xl bg-ironman-red px-4 py-3 text-sm font-bold text-white shadow-glow transition hover:bg-ironman-red-dark disabled:opacity-60"
          >
            {submitting ? 'Sending…' : 'Send reset code'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-500">
          Remembered it?{' '}
          <Link href="/login" className="font-bold text-ironman-navy hover:text-ironman-red">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
