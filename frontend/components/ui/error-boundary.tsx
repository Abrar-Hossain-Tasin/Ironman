'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  /** Friendly title shown to the user when the boundary catches. */
  title?: string
  /** Optional render-prop fallback to fully customise the empty state. */
  fallback?: (args: { error: Error; reset: () => void }) => ReactNode
}

type State = {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Report to Sentry if available — the SDK is already imported at the app root.
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary]', error, info.componentStack)
    }
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback({ error: this.state.error, reset: this.reset })
      }
      return (
        <div
          role="alert"
          className="flex flex-col items-start gap-4 rounded-xl border border-ironman-red-100 bg-ironman-red-50/40 p-5 text-sm text-ironman-red sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden />
            <div>
              <p className="font-semibold leading-relaxed">
                {this.props.title ?? 'Something went wrong loading this section.'}
              </p>
              <p className="mt-1 text-xs font-normal text-ironman-red/80">
                {this.state.error.message}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={this.reset}
            className="tap-target focus-ring inline-flex flex-shrink-0 items-center gap-2 rounded-lg border border-ironman-red/30 bg-white px-4 py-2 text-sm font-semibold text-ironman-red transition-colors hover:bg-ironman-red hover:text-white"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
