'use client'

import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'

export function LogoutButton() {
  const router = useRouter()
  const clearAuth = useAuthStore((state) => state.clearAuth)

  return (
    <button
      type="button"
      className="tap-target rounded-lg border border-ironman-navy px-3 py-2 text-sm font-semibold text-ironman-navy"
      onClick={() => {
        void (async () => {
          try {
            await apiFetch('/auth/logout', { method: 'POST', skipRefresh: true })
          } finally {
            clearAuth()
            router.push('/login')
          }
        })()
      }}
    >
      Logout
    </button>
  )
}
