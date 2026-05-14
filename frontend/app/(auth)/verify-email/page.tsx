import { Suspense } from 'react'
import { VerifyEmailView } from '@/components/auth/verify-email-view'

export const metadata = {
  title: 'Verify your email — IRONMAN Laundry'
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-ironman-navy-50/40" />}>
      <VerifyEmailView />
    </Suspense>
  )
}
