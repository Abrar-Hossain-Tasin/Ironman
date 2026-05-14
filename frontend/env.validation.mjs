const PLACEHOLDER_PATTERNS = [
  /^$/,
  /^replace-me$/i,
  /^your-/i,
  /your-project/i,
  /example/i
]

const REQUIRED_PRODUCTION_ENV = [
  { key: 'NEXT_PUBLIC_API_URL', label: 'frontend API base URL', type: 'url', allowLocalhost: false },
  { key: 'NEXT_PUBLIC_SUPABASE_URL', label: 'Supabase project URL', type: 'url', allowLocalhost: false },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', label: 'Supabase anon key' },
  { key: 'NEXT_PUBLIC_BKASH_MERCHANT_NAME', label: 'bKash merchant name' },
  { key: 'NEXT_PUBLIC_BKASH_MERCHANT_NUMBER', label: 'bKash merchant number' },
  { key: 'NEXT_PUBLIC_SENTRY_DSN', label: 'Sentry browser DSN', type: 'url', allowLocalhost: false }
]

export function validateFrontendEnv() {
  if (!shouldValidate()) return

  const errors = []
  for (const spec of REQUIRED_PRODUCTION_ENV) {
    const value = process.env[spec.key]?.trim() ?? ''
    if (isPlaceholder(value)) {
      errors.push(`${spec.key} is required for ${spec.label}.`)
      continue
    }

    if (spec.type === 'url') {
      const parsed = parseUrl(value)
      if (!parsed) {
        errors.push(`${spec.key} must be a valid URL.`)
      } else if (!spec.allowLocalhost && isLocalUrl(parsed)) {
        errors.push(`${spec.key} must not point to localhost in production.`)
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Production frontend environment is not ready:\n- ${errors.join('\n- ')}`)
  }
}

function shouldValidate() {
  if (process.env.SKIP_ENV_VALIDATION === 'true') return false
  return process.env.STRICT_ENV_VALIDATION === 'true' || process.env.VERCEL_ENV === 'production'
}

function isPlaceholder(value) {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value.trim()))
}

function parseUrl(value) {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

function isLocalUrl(url) {
  return ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(url.hostname)
}
