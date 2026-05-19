'use client'

import { isServer, QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // apiFetch already runs a silent /auth/refresh + retry on 401, so we
        // skip TanStack's own retry on auth errors to avoid stacking the
        // refresh dance on top of it.
        retry: (failureCount, error) => {
          if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
            return false
          }
          return failureCount < 2
        },
        staleTime: 30_000,
        refetchOnWindowFocus: false
      },
      mutations: {
        retry: false
      }
    }
  })
}

let browserClient: QueryClient | undefined

export function getQueryClient() {
  if (isServer) {
    // Always make a new client on the server so per-request state never
    // leaks across requests (matches the official TanStack v5 app-router
    // recommendation).
    return makeQueryClient()
  }
  if (!browserClient) browserClient = makeQueryClient()
  return browserClient
}
