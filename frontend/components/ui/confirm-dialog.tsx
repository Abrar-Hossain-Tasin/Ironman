'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from 'react'
import { cn } from '@/lib/utils'

type ConfirmOptions = {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'default'
  /** Show a required free-text field — the modal equivalent of window.prompt(). */
  requireReason?: boolean
  reasonLabel?: string
  reasonPlaceholder?: string
}

type ConfirmResult = { confirmed: boolean; reason: string }

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<ConfirmResult>) | null>(null)

/**
 * Promise-based replacement for window.confirm() / window.prompt() — those are
 * blocked in some browsers and PWA contexts, and look inconsistent with the
 * app's own dialogs. Usage:
 *   const confirm = useConfirm()
 *   const { confirmed, reason } = await confirm({ title, requireReason: true })
 */
export function useConfirm() {
  const confirm = useContext(ConfirmContext)
  if (!confirm) {
    throw new Error('useConfirm must be used within a <ConfirmProvider>')
  }
  return confirm
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [reason, setReason] = useState('')
  const resolverRef = useRef<((result: ConfirmResult) => void) | null>(null)

  const confirm = useCallback((next: ConfirmOptions) => {
    setReason('')
    setOptions(next)
    return new Promise<ConfirmResult>((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  const settle = useCallback(
    (confirmed: boolean) => {
      resolverRef.current?.({ confirmed, reason: confirmed ? reason.trim() : '' })
      resolverRef.current = null
      setOptions(null)
      setReason('')
    },
    [reason]
  )

  useEffect(() => {
    if (!options) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') settle(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [options, settle])

  const reasonMissing = Boolean(options?.requireReason) && !reason.trim()

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <div className="absolute inset-0" onClick={() => settle(false)} aria-hidden />
          <div className="relative w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="p-5">
              <h2 id="confirm-dialog-title" className="text-lg font-bold text-ironman-navy">
                {options.title}
              </h2>
              {options.message ? <p className="mt-2 text-sm text-gray-600">{options.message}</p> : null}
              {options.requireReason ? (
                <label className="mt-4 block">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    {options.reasonLabel ?? 'Reason'}
                  </span>
                  <textarea
                    autoFocus
                    rows={3}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder={options.reasonPlaceholder}
                    className="mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 text-sm focus-ring"
                  />
                </label>
              ) : null}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-ironman-navy-100 px-5 py-3">
              <button
                type="button"
                onClick={() => settle(false)}
                className="tap-target focus-ring rounded-lg border border-ironman-navy-100 bg-white px-4 py-2 text-sm font-semibold text-ironman-navy"
              >
                {options.cancelLabel ?? 'Cancel'}
              </button>
              <button
                type="button"
                autoFocus={!options.requireReason}
                onClick={() => settle(true)}
                disabled={reasonMissing}
                className={cn(
                  'tap-target focus-ring rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60',
                  options.tone === 'danger' ? 'bg-ironman-red' : 'bg-ironman-navy'
                )}
              >
                {options.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  )
}
