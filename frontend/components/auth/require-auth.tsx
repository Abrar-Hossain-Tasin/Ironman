'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { PanelSkeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/lib/auth-store'
import type { UserRole } from '@/types'

type RequireAuthProps = {
  roles?: UserRole[]
  children: ReactNode
}

export function RequireAuth({ roles, children }: RequireAuthProps) {
  const router = useRouter()
  const accessToken = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)
  const hasHydrated = useAuthStore((state) => state.hasHydrated)

  useEffect(() => {
    if (!hasHydrated) return
    if (!accessToken) {
      router.replace('/login')
      return
    }
    if (roles && user && !roles.includes(user.role)) {
      router.replace('/')
    }
  }, [accessToken, hasHydrated, roles, router, user])

  if (!hasHydrated) {
    return <PanelSkeleton rows={3} />
  }

  if (!accessToken) {
    return <p className="rounded-lg bg-white p-5 text-sm font-semibold text-ironman-navy shadow-soft">Redirecting to login...</p>
  }

  if (roles && user && !roles.includes(user.role)) {
    return <p className="rounded-lg bg-white p-5 text-sm font-semibold text-ironman-navy shadow-soft">Redirecting...</p>
  }

  return <>{children}</>
}
