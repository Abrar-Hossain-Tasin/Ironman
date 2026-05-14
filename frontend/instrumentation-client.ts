import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: sampleRate(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE, 0.1),
  replaysSessionSampleRate: sampleRate(process.env.NEXT_PUBLIC_SENTRY_REPLAY_SESSION_SAMPLE_RATE, 0.0),
  replaysOnErrorSampleRate: sampleRate(process.env.NEXT_PUBLIC_SENTRY_REPLAY_ERROR_SAMPLE_RATE, 1.0),
  enableLogs: true,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true
    })
  ]
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

function sampleRate(value: string | undefined, fallback: number) {
  if (!value) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(1, Math.max(0, parsed))
}
