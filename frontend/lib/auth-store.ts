'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiFetch, clearCsrfToken, configureAuthRefresh, setCsrfToken } from '@/lib/api'
import type { AuthResponse, UserSummary } from '@/types'

const COOKIE_SESSION_TOKEN = 'cookie-session'

type AuthState = {
  accessToken: string | null
  refreshToken: string | null
  user: UserSummary | null
  hasHydrated: boolean
  setAuth: (auth: AuthResponse) => void
  setUser: (user: UserSummary) => void
  clearAuth: () => void
  bootstrapSession: () => Promise<void>
  setHasHydrated: (value: boolean) => void
}

function writeSessionMarker(active: boolean) {
  if (typeof document === 'undefined') return
  document.cookie = active
    ? 'ironman_session=1; path=/; max-age=1209600; SameSite=Lax'
    : 'ironman_session=; path=/; max-age=0; SameSite=Lax'
}

function setSessionUser(set: (state: Partial<AuthState>) => void, user: UserSummary) {
  writeSessionMarker(true)
  set({
    accessToken: COOKIE_SESSION_TOKEN,
    refreshToken: null,
    user,
    hasHydrated: true
  })
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      hasHydrated: false,
      setAuth: (auth) => {
        setCsrfToken(auth.csrfToken)
        setSessionUser(set, auth.user)
      },
      setUser: (user) => setSessionUser(set, user),
      clearAuth: () => {
        clearCsrfToken()
        writeSessionMarker(false)
        set({ accessToken: null, refreshToken: null, user: null, hasHydrated: true })
      },
      bootstrapSession: async () => {
        try {
          const user = await apiFetch<UserSummary>('/users/me')
          setSessionUser(set, user)
        } catch {
          clearCsrfToken()
          writeSessionMarker(false)
          set({ accessToken: null, refreshToken: null, user: null, hasHydrated: true })
        }
      },
      setHasHydrated: (value) => set({ hasHydrated: value })
    }),
    {
      name: 'ironman-auth',
      partialize: (state) => ({ user: state.user }),
      merge: (persisted, current) => ({
        ...current,
        user: persisted && typeof persisted === 'object'
          ? (persisted as Partial<AuthState>).user ?? null
          : null
      }),
      onRehydrateStorage: () => (state) => {
        if (typeof window === 'undefined') {
          state?.setHasHydrated(true)
          return
        }
        window.queueMicrotask(() => {
          void state?.bootstrapSession()
        })
      }
    }
  )
)

configureAuthRefresh({
  onRefreshed: (auth) => useAuthStore.getState().setAuth(auth),
  onAuthLost: () => {
    useAuthStore.getState().clearAuth()
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.assign('/login')
    }
  }
})

export function roleHome(role?: string) {
  if (role === 'admin') return '/admin/dashboard'
  if (role === 'delivery_man') return '/delivery/dashboard'
  if (role === 'wash_man' || role === 'iron_man' || role === 'dry_clean_man') return '/worker/dashboard'
  return '/customer/dashboard'
}
