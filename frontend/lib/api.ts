import type { AuthResponse } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8090/api/v1'
const CSRF_HEADER = 'X-CSRF-Token'
const CSRF_STORAGE_KEY = 'ironman-csrf-token'

type ApiOptions = Omit<RequestInit, 'body'> & {
  /**
   * Kept for existing callers while auth migrates to httpOnly cookies.
   * The value is intentionally ignored and never sent as a bearer token.
   */
  token?: string | null
  body?: BodyInit | Record<string, unknown> | null
  /** When true, skip the silent-refresh retry on 401. Used internally to avoid loops. */
  skipRefresh?: boolean
  /** Used internally after refreshing a stale CSRF token. */
  skipCsrfRetry?: boolean
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: string
  ) {
    super(message)
  }
}

type RefreshContext = {
  onRefreshed: (auth: AuthResponse) => void
  onAuthLost: () => void
}

let refreshCtx: RefreshContext | null = null
let inFlightRefresh: Promise<AuthResponse | null> | null = null
let csrfToken: string | null = null
let inFlightCsrf: Promise<string | null> | null = null

export function configureAuthRefresh(ctx: RefreshContext) {
  refreshCtx = ctx
}

export function setCsrfToken(token: string | null | undefined) {
  csrfToken = token?.trim() || null
  if (typeof window === 'undefined') return
  try {
    if (csrfToken) {
      window.sessionStorage.setItem(CSRF_STORAGE_KEY, csrfToken)
    } else {
      window.sessionStorage.removeItem(CSRF_STORAGE_KEY)
    }
  } catch {
    // Session storage can be unavailable in strict privacy modes.
  }
}

export function clearCsrfToken() {
  setCsrfToken(null)
}

async function attemptRefresh(): Promise<AuthResponse | null> {
  if (!refreshCtx) return null
  if (inFlightRefresh) return inFlightRefresh

  inFlightRefresh = (async () => {
    try {
      const next = await apiFetch<AuthResponse>('/auth/refresh', {
        method: 'POST',
        body: null,
        skipRefresh: true
      })
      refreshCtx?.onRefreshed(next)
      return next
    } catch {
      refreshCtx?.onAuthLost()
      return null
    } finally {
      inFlightRefresh = null
    }
  })()
  return inFlightRefresh
}

export async function apiFetch<T>(path: string, init?: ApiOptions): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase()
  const unsafeRequest = isUnsafeMethod(method)
  const headers = new Headers(init?.headers)
  headers.set('Accept', headers.get('Accept') ?? 'application/json')

  if (unsafeRequest) {
    const token = await ensureCsrfToken()
    if (token) headers.set(CSRF_HEADER, token)
  }

  const body = normalizeBody(init?.body, headers)

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    body,
    cache: 'no-store',
    credentials: 'include'
  })

  const responseCsrf = response.headers.get(CSRF_HEADER)
  if (responseCsrf) setCsrfToken(responseCsrf)

  if (response.status === 403 && unsafeRequest && !init?.skipCsrfRetry) {
    clearCsrfToken()
    return apiFetch<T>(path, { ...init, skipCsrfRetry: true })
  }

  if (response.status === 401 && !init?.skipRefresh && !isPublicAuthPath(path)) {
    const next = await attemptRefresh()
    if (next) {
      return apiFetch<T>(path, { ...init, skipRefresh: true })
    }
  }

  if (!response.ok) {
    let detail = `API request failed: ${response.status}`
    const resClone = response.clone()
    try {
      const problem = await response.json()
      detail = problem.detail ?? problem.title ?? problem.message ?? detail
    } catch {
      detail = await resClone.text()
    }
    throw new ApiError(detail, response.status, detail)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const data = (await response.json()) as T
  captureCsrfFromBody(data)
  return data
}

export const endpoints = {
  categories: '/services/categories',
  clothingTypes: '/services/clothing-types',
  pricing: '/services/pricing',
  adminPricing: '/admin/pricing',
  adminPricingHistory: '/admin/pricing/history',
  adminDeactivatePricing: (id: string) => `/admin/pricing/${id}`,
  tracking: (orderNumber: string) => `/tracking/${orderNumber}`
}

export function apiUrl(path: string) {
  return `${API_URL}${path}`
}

function normalizeBody(
  rawBody: ApiOptions['body'] | undefined,
  headers: Headers
): BodyInit | null | undefined {
  if (rawBody == null) return rawBody as null | undefined
  if (isJsonPayload(rawBody)) {
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    return JSON.stringify(rawBody)
  }
  return rawBody as BodyInit
}

function isJsonPayload(body: ApiOptions['body']): body is Record<string, unknown> {
  return Boolean(
    body
      && typeof body === 'object'
      && !(body instanceof FormData)
      && !(body instanceof Blob)
      && !(body instanceof URLSearchParams)
      && !(body instanceof ArrayBuffer)
      && !(ArrayBuffer.isView(body))
  )
}

function isUnsafeMethod(method: string) {
  return method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS' && method !== 'TRACE'
}

function isPublicAuthPath(path: string) {
  return [
    '/auth/csrf',
    '/auth/login',
    '/auth/register',
    '/auth/send-verification',
    '/auth/verify-email',
    '/auth/forgot-password',
    '/auth/reset-password'
  ].includes(path)
}

async function ensureCsrfToken() {
  const stored = readStoredCsrfToken()
  if (stored) return stored
  if (typeof window === 'undefined') return null
  if (inFlightCsrf) return inFlightCsrf

  inFlightCsrf = (async () => {
    const response = await fetch(`${API_URL}/auth/csrf`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      credentials: 'include'
    })
    if (!response.ok) {
      throw new ApiError('Could not initialize the security token.', response.status)
    }
    const data = (await response.json()) as { csrfToken?: string | null }
    const nextToken = data.csrfToken ?? response.headers.get(CSRF_HEADER)
    setCsrfToken(nextToken)
    return nextToken ?? null
  })().finally(() => {
    inFlightCsrf = null
  })

  return inFlightCsrf
}

function readStoredCsrfToken() {
  if (csrfToken) return csrfToken
  if (typeof window === 'undefined') return null
  try {
    csrfToken = window.sessionStorage.getItem(CSRF_STORAGE_KEY)
  } catch {
    csrfToken = null
  }
  return csrfToken
}

function captureCsrfFromBody(data: unknown) {
  if (!data || typeof data !== 'object' || !('csrfToken' in data)) return
  const nextToken = (data as { csrfToken?: unknown }).csrfToken
  if (typeof nextToken === 'string') setCsrfToken(nextToken)
}
