'use client'

import { FormEvent, useState, useId } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, User, Phone, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch, ApiError } from '@/lib/api'
import { roleHome, useAuthStore } from '@/lib/auth-store'
import type { AuthResponse } from '@/types'

// Dhaka phone: +8801XXXXXXXXX (13 chars) or 01XXXXXXXXX (11 digits).
const PHONE_PATTERN = /^(\+?880)?1[3-9]\d{8}$/

function isStrongPassword(password: string) {
  // Min 8 chars and at least one letter + one digit. Keeps friction low while
  // ruling out obvious junk like "password" or "12345678".
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password)
}

function passwordStrength(password: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++
  const labels = ['Too short', 'Weak', 'Okay', 'Strong', 'Excellent'] as const
  return { score: score as 0 | 1 | 2 | 3 | 4, label: labels[score] }
}

// ─── Reusable Animated Input ───────────────────────────────────────────────
function FloatingInput({
  name,
  label,
  type = 'text',
  icon: Icon,
  required,
  minLength,
  delay = 0,
  shake = false,
  value,
  onChange,
  trailing,
  inputType,
  autoComplete,
  inputMode,
  pattern
}: any) {
  const [focused, setFocused] = useState(false)
  const [internal, setInternal] = useState('')
  const isControlled = value !== undefined
  const current = isControlled ? value : internal
  const hasValue = String(current ?? '').length > 0
  const id = useId()

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div animate={shake ? { x: [0, -8, 8, -8, 8, 0] } : {}} className="relative">
        <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300 ${focused ? 'scale-110 text-ironman-red' : 'text-gray-300'}`}>
          <Icon className="h-4 w-4" />
        </div>
        <input
          id={id}
          name={name}
          type={inputType ?? type}
          required={required}
          minLength={minLength}
          placeholder=" "
          autoComplete={autoComplete}
          inputMode={inputMode}
          pattern={pattern}
          value={current ?? ''}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            if (!isControlled) setInternal(e.target.value)
            onChange?.(e)
          }}
          className={`peer w-full rounded-2xl border bg-white pl-11 ${trailing ? 'pr-12' : 'pr-4'} pt-6 pb-2 font-body text-sm text-ironman-navy outline-none transition-all duration-300
            ${focused ? 'border-ironman-red shadow-[0_0_15px_rgba(216,27,42,0.1)]' : 'border-ironman-navy-100 hover:border-ironman-navy-200'}`}
        />
        <label htmlFor={id} className={`pointer-events-none absolute left-11 font-body transition-all duration-300
            ${focused || hasValue ? 'top-2 text-[10px] font-bold uppercase tracking-wider text-ironman-red' : 'top-1/2 -translate-y-1/2 text-sm text-gray-400'}`}>
          {label}
        </label>
        {trailing ? <div className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</div> : null}
      </motion.div>
    </motion.div>
  )
}

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const isLogin = mode === 'login'

  const strength = passwordStrength(password)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!isLogin) {
      if (!PHONE_PATTERN.test(phone.trim())) {
        const msg = 'Enter a valid Bangladesh phone number (e.g. 01XXXXXXXXX).'
        setError(msg)
        toast.error(msg)
        return
      }
      if (!isStrongPassword(password)) {
        const msg = 'Password must be at least 8 characters and include a letter and a digit.'
        setError(msg)
        toast.error(msg)
        return
      }
      if (!acceptedTerms) {
        const msg = 'Please accept the Terms of Service and Privacy Policy to continue.'
        setError(msg)
        toast.error(msg)
        return
      }
    }

    setLoading(true)
    const form = new FormData(event.currentTarget)
    const payload = isLogin
      ? { email: String(form.get('email') ?? ''), password }
      : {
          fullName: String(form.get('fullName') ?? ''),
          email: String(form.get('email') ?? ''),
          phone: phone.trim(),
          password
        }

    try {
      const auth = await apiFetch<AuthResponse>(isLogin ? '/auth/login' : '/auth/register', {
        method: 'POST',
        body: payload
      })
      setAuth(auth)
      const address = String(form.get('address') ?? '').trim()
      if (mode === 'register' && address) {
        await apiFetch('/users/me/addresses', {
          method: 'POST',
          body: { label: 'Home', addressLine1: address, area: 'Dhaka', city: 'Dhaka', defaultAddress: true }
        })
      }
      if (mode === 'register') {
        toast.success('Account created. Check your email for the verification code.')
        router.push(`/verify-email?email=${encodeURIComponent(auth.user.email)}`)
      } else {
        toast.success(`Welcome back, ${auth.user.fullName}.`)
        router.push(roleHome(auth.user.role))
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail || err.message : err instanceof Error ? err.message : 'Authentication failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const meterColor =
    strength.score >= 3 ? 'bg-emerald-500' : strength.score === 2 ? 'bg-amber-400' : 'bg-ironman-red'

  return (
    <form className="mt-8 space-y-4" onSubmit={submit} noValidate>
      <AnimatePresence mode="popLayout">
        {!isLogin && (
          <div className="space-y-4">
            <FloatingInput name="fullName" label="Full Name" icon={User} required delay={0.1} shake={!!error} autoComplete="name" />
            <FloatingInput
              name="phone"
              label="Phone Number (01XXXXXXXXX)"
              icon={Phone}
              required
              delay={0.15}
              shake={!!error}
              autoComplete="tel"
              inputMode="tel"
              value={phone}
              onChange={(e: any) => setPhone(e.target.value)}
            />
          </div>
        )}
      </AnimatePresence>

      <FloatingInput
        name="email"
        label="Email Address"
        type="email"
        icon={Mail}
        required
        delay={0.2}
        shake={!!error}
        autoComplete="email"
      />

      <FloatingInput
        name="password"
        label="Password"
        inputType={showPassword ? 'text' : 'password'}
        icon={Lock}
        required
        minLength={8}
        delay={0.25}
        shake={!!error}
        value={password}
        onChange={(e: any) => setPassword(e.target.value)}
        autoComplete={isLogin ? 'current-password' : 'new-password'}
        trailing={
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="rounded-full p-1.5 text-gray-400 hover:bg-ironman-navy-50 hover:text-ironman-navy"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
      />

      {!isLogin && password ? (
        <div className="px-2">
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full transition-all duration-300 ${meterColor}`}
              style={{ width: `${Math.max(10, (strength.score / 4) * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] font-semibold text-gray-500">{strength.label}</p>
        </div>
      ) : null}

      {isLogin && (
        <div className="flex justify-end pt-1">
          <Link href="/forgot-password" className="text-xs font-bold text-ironman-red underline-offset-4 hover:underline">
            Forgot password?
          </Link>
        </div>
      )}

      {!isLogin && (
        <label className="flex items-start gap-2 px-2 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-ironman-red"
          />
          <span>
            I agree to the{' '}
            <Link href="/legal/terms" className="font-semibold text-ironman-red hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/legal/privacy" className="font-semibold text-ironman-red hover:underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
      )}

      <motion.button
        type="submit"
        disabled={loading}
        whileTap={{ scale: 0.96 }}
        className="relative h-14 w-full overflow-hidden rounded-2xl bg-ironman-red font-body font-bold text-white shadow-glow transition-all hover:shadow-luxury disabled:opacity-70"
      >
        <span className="relative z-10">{loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}</span>
        <div className="absolute inset-0 z-0 animate-shimmer-sweep bg-shimmer" style={{ backgroundSize: '200% 100%' }} />
      </motion.button>
    </form>
  )
}
