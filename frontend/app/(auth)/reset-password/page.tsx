import { Suspense } from 'react'
import { ResetPasswordView } from '@/components/auth/reset-password-view'

export const metadata = {
  title: 'Reset password — IRONMAN Laundry'
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-ironman-navy-50/40" />}>
      <ResetPasswordView />
    </Suspense>
  )
}
