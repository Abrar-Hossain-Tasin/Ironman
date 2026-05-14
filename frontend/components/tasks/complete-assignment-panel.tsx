'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { apiFetch, ApiError } from '@/lib/api'
import { PhotoEvidenceField } from '@/components/tasks/photo-evidence-field'
import type { Assignment, AssignmentType } from '@/types'

type CompleteAssignmentPanelProps = {
  assignment: Assignment
  token: string | null
  endpointBase: '/delivery' | '/worker'
  onCompleted?: () => void
  title?: string
  hint?: string
}

const KIND_FOR_TYPE: Record<AssignmentType, 'pickup' | 'delivery' | 'wash' | 'iron' | 'dry_clean'> = {
  pickup: 'pickup',
  delivery: 'delivery',
  wash: 'wash',
  iron: 'iron',
  dry_clean: 'dry_clean'
}

export function CompleteAssignmentPanel({
  assignment,
  token,
  endpointBase,
  onCompleted,
  title,
  hint
}: CompleteAssignmentPanelProps) {
  const [notes, setNotes] = useState('')
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canComplete = assignment.status === 'accepted' || assignment.status === 'in_progress'
  if (!canComplete) return null

  async function submit() {
    if (!token) return
    setSubmitting(true)
    setError(null)
    try {
      await apiFetch(`${endpointBase}/assignments/${assignment.id}/complete`, {
        method: 'PUT',
        token,
        body: {
          notes: notes.trim() || null,
          photoUrls
        }
      })
      setNotes('')
      setPhotoUrls([])
      onCompleted?.()
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail || err.message : err instanceof Error ? err.message : 'Could not complete'
      setError(msg || 'Could not complete')
    } finally {
      setSubmitting(false)
    }
  }

  const resolvedTitle =
    title ?? (endpointBase === '/delivery' ? 'Complete with proof' : 'Complete with photo evidence')
  const resolvedHint =
    hint ??
    (endpointBase === '/delivery'
      ? 'Attach a photo and note before marking the hand-off complete.'
      : 'Capture a photo at the station before passing the order to the next stage.')

  return (
    <section className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
      <h2 className="flex items-center gap-2 text-lg font-bold text-ironman-navy">
        <CheckCircle2 className="h-5 w-5 text-ironman-red" aria-hidden />
        {resolvedTitle}
      </h2>
      <p className="mt-1 text-sm text-gray-600">{resolvedHint}</p>

      <div className="mt-3">
        <PhotoEvidenceField
          notes={notes}
          photoUrls={photoUrls}
          onNotesChange={setNotes}
          onPhotoUrlsChange={setPhotoUrls}
          orderId={assignment.orderId}
          assignmentId={assignment.id}
          kind={KIND_FOR_TYPE[assignment.assignmentType]}
          notesLabel="Notes for the audit trail"
          placeholder={
            endpointBase === '/delivery'
              ? 'e.g. handed to customer at the door; receipt photographed'
              : 'e.g. 10 shirts moved to ironing; no damage'
          }
          disabled={submitting}
        />
      </div>

      {error ? (
        <p className="mt-3 rounded-lg bg-ironman-red-50 px-3 py-2 text-sm font-semibold text-ironman-red">{error}</p>
      ) : null}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="tap-target focus-ring mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ironman-red px-4 py-3 font-semibold text-white disabled:opacity-60"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <CheckCircle2 className="h-4 w-4" aria-hidden />}
        {submitting ? 'Marking complete…' : 'Mark complete'}
      </button>
    </section>
  )
}
