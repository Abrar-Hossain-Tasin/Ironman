'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalErrorBoundary({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
    console.error('Fatal error:', error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#eef0f8',
          fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
          color: '#1B2454'
        }}
      >
        <div
          style={{
            maxWidth: 480,
            background: '#fff',
            padding: '32px',
            borderRadius: 12,
            boxShadow: '0 18px 45px rgba(27, 36, 84, 0.10)'
          }}
        >
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>The app crashed</h1>
          <p style={{ marginTop: 12, color: '#374151' }}>
            A critical error prevented the page from loading. Please retry, or refresh your browser.
          </p>
          {error.digest ? (
            <p style={{ marginTop: 12, fontSize: 12, color: '#9CA3AF', fontFamily: 'monospace' }}>
              Reference: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 20,
              padding: '10px 16px',
              background: '#D81B2A',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
