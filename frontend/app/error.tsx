'use client'

import * as Sentry from '@sentry/nextjs'
import Link from 'next/link'
import { useEffect } from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
    console.error('Unhandled error:', error)
  }, [error])

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg rounded-xl border border-ironman-red-100 bg-white p-8 shadow-soft">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-ironman-red-50 p-3 text-ironman-red">
            <AlertTriangle className="h-6 w-6" aria-hidden />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-ironman-navy">Something went wrong</h1>
            <p className="mt-2 text-sm text-gray-600">
              We hit an unexpected error. Our team has been notified. You can retry, or head back to a known page.
            </p>
            {error.digest ? (
              <p className="mt-3 text-xs font-mono text-gray-400">Reference: {error.digest}</p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={reset}
                className="focus-ring inline-flex items-center gap-2 rounded-lg bg-ironman-red px-4 py-2 text-sm font-bold text-white shadow-glow hover:bg-ironman-red-dark"
              >
                <RotateCw className="h-4 w-4" aria-hidden />
                Try again
              </button>
              <Link
                href="/"
                className="focus-ring inline-flex items-center rounded-lg border border-ironman-navy-100 px-4 py-2 text-sm font-bold text-ironman-navy hover:bg-ironman-navy-50"
              >
                Go home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
