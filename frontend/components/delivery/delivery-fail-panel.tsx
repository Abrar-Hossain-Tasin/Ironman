'use client'

import { FormEvent, useState } from 'react'
import { AlertOctagon } from 'lucide-react'
import { apiFetch, ApiError } from '@/lib/api'
import type { Assignment } from '@/types'

type Props = {
  assignment: Assignment
  token: string | null
  onFailed: () => void
}

/**
 * Mark a delivery attempt as failed (customer not home / refused / wrong
 * address). Only renders for {@code delivery} assignments that are in flight —
 * the backend rejects everything else anyway, but we don't bother the agent
 * with the button when it's clearly inapplicable.
 */
export function DeliveryFailPanel({ assignment, token, onFailed }: Props) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (assignment.assignmentType !== 'delivery') return null
  if (assignment.status === 'completed' || assignment.status === 'rejected') return null

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return
    const trimmed = reason.trim()
    if (trimmed.length < 3) {
      setError('Give a short reason so the customer knows what happened.')
      return
    }
    if (!window.confirm(`Mark ${assignment.orderNumber} as failed delivery? The customer will be notified.`)) {
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await apiFetch(`/delivery/assignments/${assignment.id}/fail`, {
        method: 'PATCH',
        token,
        body: { reason: trimmed }
      })
      setReason('')
      onFailed()
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.detail || err.message
          : err instanceof Error
            ? err.message
            : 'Could not mark failed'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-ironman-red-100 bg-ironman-red-50/40 p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold text-ironman-red">
        <AlertOctagon className="h-5 w-5" aria-hidden />
        Couldn&apos;t deliver?
      </h2>
      <p className="mt-1 text-sm text-gray-700">
        Pick this if the customer wasn&apos;t reachable, refused the order, or the address was wrong. The order
        moves back to admin for re-assignment or return.
      </p>
      <textarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        rows={2}
        maxLength={500}
        placeholder="e.g. Customer not at address, phone unreachable"
        className="mt-3 w-full rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 text-sm focus-ring"
      />
      {error ? (
        <p className="mt-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-ironman-red">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={submitting}
        className="tap-target focus-ring mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-ironman-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {submitting ? 'Submitting…' : 'Mark delivery failed'}
      </button>
    </form>
  )
}
