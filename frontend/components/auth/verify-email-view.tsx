'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { MailCheck, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch, ApiError } from '@/lib/api'
import { roleHome, useAuthStore } from '@/lib/auth-store'
import type { AuthResponse } from '@/types'

const RESEND_COOLDOWN_SECONDS = 30

export function VerifyEmailView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const storedEmail = useAuthStore((state) => state.user?.email)
  const setAuth = useAuthStore((state) => state.setAuth)

  const initialEmail = searchParams.get('email') ?? storedEmail ?? ''
  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    if (resendIn <= 0) return
    const id = window.setInterval(() => setResendIn((v) => Math.max(0, v - 1)), 1000)
    return () => window.clearInterval(id)
  }, [resendIn])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const auth = await apiFetch<AuthResponse>('/auth/verify-email', {
        method: 'POST',
        body: { email, code }
      })
      setAuth(auth)
      toast.success('Email verified.')
      router.push(roleHome(auth.user.role))
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail || err.message : 'Verification failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function resend() {
    if (resendIn > 0) return
    try {
      await apiFetch('/auth/send-verification', { method: 'POST', body: { email } })
      toast.success('A new verification code has been sent to your inbox.')
      setResendIn(RESEND_COOLDOWN_SECONDS)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail || err.message : 'Could not resend code')
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ironman-navy-50/40 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-ironman-navy-100 bg-white p-8 shadow-luxury">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-ironman-red-50 text-ironman-red">
          <MailCheck className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="mt-5 text-center text-2xl font-bold text-ironman-navy">Verify your email</h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          We sent a 6-digit code to <span className="font-bold text-ironman-navy">{email || 'your inbox'}</span>.
          Enter it below to confirm your account.
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
            Verification code
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className="mt-2 w-full rounded-xl border border-ironman-navy-100 bg-white px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] text-ironman-navy outline-none focus:border-ironman-red"
            />
          </label>

          <button
            type="submit"
            disabled={submitting || code.length !== 6}
            className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ironman-red px-4 py-3 text-sm font-bold text-white shadow-glow transition hover:bg-ironman-red-dark disabled:opacity-60"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden />
            {submitting ? 'Verifying…' : 'Verify email'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-500">
          Didn’t get the code?{' '}
          <button
            type="button"
            onClick={resend}
            disabled={resendIn > 0}
            className="font-bold text-ironman-red underline-offset-4 hover:underline disabled:opacity-50 disabled:no-underline"
          >
            {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          Wrong email?{' '}
          <Link href="/login" className="font-bold text-ironman-navy hover:text-ironman-red">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
