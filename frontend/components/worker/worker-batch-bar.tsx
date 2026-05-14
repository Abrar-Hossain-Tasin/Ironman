'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2, PlayCircle, X } from 'lucide-react'
import { apiFetch, ApiError } from '@/lib/api'
import { PhotoEvidenceField } from '@/components/tasks/photo-evidence-field'
import type { Assignment } from '@/types'

type WorkerBatchBarProps = {
  selected: Assignment[]
  token: string | null
  onClearSelection: () => void
  onChanged: () => void
}

type Mode = 'idle' | 'start' | 'complete'

export function WorkerBatchBar({ selected, token, onClearSelection, onChanged }: WorkerBatchBarProps) {
  const [mode, setMode] = useState<Mode>('idle')
  const [notes, setNotes] = useState('')
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  if (selected.length === 0) return null

  const startable = selected.filter((a) => a.status === 'pending' || a.status === 'accepted')
  const completable = selected.filter((a) => a.status === 'accepted' || a.status === 'in_progress')

  async function runStart() {
    if (!token) return
    setSubmitting(true)
    setError(null)
    setProgress({ done: 0, total: startable.length })

    let done = 0
    const failures: string[] = []
    // /start has no batch endpoint server-side and the per-task transition is
    // idempotent — keep it sequential so progress is observable.
    for (const assignment of startable) {
      try {
        await apiFetch(`/worker/assignments/${assignment.id}/start`, { method: 'PUT', token })
      } catch (err) {
        const msg = err instanceof ApiError ? err.detail || err.message : err instanceof Error ? err.message : 'unknown error'
        failures.push(`${assignment.orderNumber}: ${msg}`)
      }
      done += 1
      setProgress({ done, total: startable.length })
    }

    setSubmitting(false)
    setProgress(null)
    if (failures.length > 0) {
      setError(`${failures.length} failed — ${failures.slice(0, 3).join('; ')}${failures.length > 3 ? '…' : ''}`)
    } else {
      setMode('idle')
      onClearSelection()
    }
    onChanged()
  }

  async function runComplete() {
    if (!token) return
    setSubmitting(true)
    setError(null)
    setProgress({ done: 0, total: completable.length })

    try {
      await apiFetch('/worker/assignments/batch-complete', {
        method: 'PUT',
        token,
        body: {
          assignmentIds: completable.map((a) => a.id),
          notes: notes.trim() || null,
          photoUrls
        }
      })
      setProgress({ done: completable.length, total: completable.length })
      setMode('idle')
      setNotes('')
      setPhotoUrls([])
      onClearSelection()
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail || err.message : err instanceof Error ? err.message : 'Batch complete failed'
      setError(msg || 'Batch complete failed')
    } finally {
      setSubmitting(false)
      setProgress(null)
      onChanged()
    }
  }

  // Photo evidence is captured against the FIRST selected assignment so the
  // storage path stays predictable; the same URLs are saved on every
  // assignment in the batch by the server.
  const evidenceAssignment = completable[0] ?? selected[0]

  return (
    <div className="sticky bottom-4 z-30 mt-6 rounded-xl border border-ironman-navy-100 bg-white p-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-ironman-red px-3 py-1 text-sm font-semibold text-white">
            {selected.length} selected
          </span>
          <button
            type="button"
            onClick={onClearSelection}
            className="focus-ring inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold text-ironman-navy hover:bg-ironman-navy-50"
          >
            <X className="h-4 w-4" aria-hidden />
            Clear
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={submitting || startable.length === 0}
            onClick={() => setMode('start')}
            className="tap-target focus-ring inline-flex items-center gap-2 rounded-lg border border-ironman-navy bg-white px-3 py-2 text-sm font-semibold text-ironman-navy disabled:opacity-50"
          >
            <PlayCircle className="h-4 w-4" aria-hidden />
            Start {startable.length > 0 ? `(${startable.length})` : ''}
          </button>
          <button
            type="button"
            disabled={submitting || completable.length === 0}
            onClick={() => setMode('complete')}
            className="tap-target focus-ring inline-flex items-center gap-2 rounded-lg bg-ironman-red px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Complete {completable.length > 0 ? `(${completable.length})` : ''}
          </button>
        </div>
      </div>

      {mode === 'start' ? (
        <div className="mt-4 rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 p-4">
          <p className="text-sm text-ironman-navy">
            Start <strong>{startable.length}</strong> task{startable.length === 1 ? '' : 's'}. Each will transition to in-progress
            and update the customer-facing order status.
          </p>
          {error ? (
            <p className="mt-2 rounded-lg bg-ironman-red-50 px-3 py-2 text-xs font-semibold text-ironman-red">{error}</p>
          ) : null}
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setMode('idle')}
              className="tap-target rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 text-sm font-semibold text-ironman-navy"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void runStart()}
              disabled={submitting}
              className="tap-target focus-ring inline-flex items-center gap-2 rounded-lg bg-ironman-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {submitting && progress ? `Starting ${progress.done}/${progress.total}…` : 'Start tasks'}
            </button>
          </div>
        </div>
      ) : null}

      {mode === 'complete' ? (
        <div className="mt-4 rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 p-4">
          <p className="text-sm text-ironman-navy">
            Complete <strong>{completable.length}</strong> task{completable.length === 1 ? '' : 's'} in one server-side transaction.
            The notes &amp; photos below are saved on every selected assignment for audit.
          </p>
          <div className="mt-3">
            <PhotoEvidenceField
              notes={notes}
              photoUrls={photoUrls}
              onNotesChange={setNotes}
              onPhotoUrlsChange={setPhotoUrls}
              orderId={evidenceAssignment.orderId}
              assignmentId={evidenceAssignment.id}
              kind={evidenceAssignment.assignmentType === 'pickup' || evidenceAssignment.assignmentType === 'delivery' ? 'other' : evidenceAssignment.assignmentType}
              notesLabel="Batch notes for audit"
              placeholder="e.g. wash cycle complete; one shirt set aside for re-wash"
              disabled={submitting}
            />
          </div>
          {error ? (
            <p className="mt-2 rounded-lg bg-ironman-red-50 px-3 py-2 text-xs font-semibold text-ironman-red">{error}</p>
          ) : null}
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setMode('idle')}
              className="tap-target rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 text-sm font-semibold text-ironman-navy"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void runComplete()}
              disabled={submitting}
              className="tap-target focus-ring inline-flex items-center gap-2 rounded-lg bg-ironman-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {submitting ? `Completing ${completable.length}…` : 'Complete tasks'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
