'use client'

import { useEffect, useState } from 'react'
import { ClipboardCheck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch, ApiError } from '@/lib/api'
import { PhotoEvidenceField } from '@/components/tasks/photo-evidence-field'
import { Skeleton } from '@/components/ui/skeleton'
import type { Assignment, OrderItemResponse } from '@/types'

type DeliveryReconcilePanelProps = {
  assignment: Assignment
  token: string | null
  onReconciled?: () => void
}

type DraftRow = {
  itemId: string
  clothingTypeName: string
  serviceCategoryName: string
  expectedQuantity: number
  actualQuantity: number
}

export function DeliveryReconcilePanel({ assignment, token, onReconciled }: DeliveryReconcilePanelProps) {
  const [rows, setRows] = useState<DraftRow[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [notes, setNotes] = useState('')
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const isPickup = assignment.assignmentType === 'pickup'
  const canReconcile = isPickup && (assignment.status === 'accepted' || assignment.status === 'in_progress')

  useEffect(() => {
    if (!canReconcile || !token) return
    let cancelled = false
    setLoading(true)
    apiFetch<OrderItemResponse[]>(`/orders/${assignment.orderId}/items`, { token })
      .then((items) => {
        if (cancelled) return
        setRows(
          items.map((item) => ({
            itemId: item.id,
            clothingTypeName: item.clothingTypeName,
            serviceCategoryName: item.serviceCategoryName,
            expectedQuantity: item.quantity,
            actualQuantity: item.actualQuantity ?? item.quantity
          }))
        )
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load order items')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [assignment.orderId, token, canReconcile])

  useEffect(() => {
    if (message) toast.success(message)
  }, [message])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  if (!isPickup) return null

  function updateQty(itemId: string, value: number) {
    setRows((current) =>
      current.map((row) => (row.itemId === itemId ? { ...row, actualQuantity: Math.max(0, value) } : row))
    )
  }

  async function submit() {
    if (!token || rows.length === 0) return
    setSubmitting(true)
    setError(null)
    setMessage(null)
    try {
      await apiFetch(`/delivery/assignments/${assignment.id}/reconcile`, {
        method: 'PUT',
        token,
        body: {
          items: rows.map((row) => ({ itemId: row.itemId, actualQuantity: row.actualQuantity })),
          notes: notes.trim() || null,
          photoUrls
        }
      })
      const mismatched = rows.filter((row) => row.actualQuantity !== row.expectedQuantity).length
      setMessage(
        mismatched > 0
          ? `Reconciled with ${mismatched} adjustment${mismatched > 1 ? 's' : ''}. Customer & admins notified.`
          : 'Reconciled — counts matched what the customer expected.'
      )
      onReconciled?.()
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail || err.message : err instanceof Error ? err.message : 'Could not save counts'
      setError(msg || 'Could not save counts')
    } finally {
      setSubmitting(false)
    }
  }

  if (!canReconcile) {
    return (
      <section className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ironman-navy">
          <ClipboardCheck className="h-5 w-5 text-ironman-red" aria-hidden />
          Reconcile at pickup
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {assignment.status === 'pending'
            ? 'Accept this pickup, then count items in front of the customer.'
            : 'Reconciliation is only available while the pickup is accepted or in progress.'}
        </p>
      </section>
    )
  }

  const hasMismatch = rows.some((row) => row.actualQuantity !== row.expectedQuantity)

  return (
    <section className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
      <h2 className="flex items-center gap-2 text-lg font-bold text-ironman-navy">
        <ClipboardCheck className="h-5 w-5 text-ironman-red" aria-hidden />
        Reconcile at pickup
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        Count each item with the customer. Adjustments update the total and notify both the customer and admins.
      </p>

      {loading ? (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">No items on this order.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {rows.map((row) => {
            const delta = row.actualQuantity - row.expectedQuantity
            return (
              <div
                key={row.itemId}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 ${
                  delta === 0 ? 'border-ironman-navy-100 bg-white' : 'border-amber-200 bg-amber-50'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ironman-navy">
                    {row.clothingTypeName} <span className="text-gray-500">· {row.serviceCategoryName}</span>
                  </p>
                  <p className="text-xs text-gray-600">Expected: {row.expectedQuantity}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQty(row.itemId, row.actualQuantity - 1)}
                    className="tap-target focus-ring h-9 w-9 rounded-lg border border-ironman-navy-100 bg-white text-lg font-bold text-ironman-navy"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={row.actualQuantity}
                    onChange={(event) => updateQty(row.itemId, Number(event.target.value) || 0)}
                    className="tap-target h-9 w-16 rounded-lg border border-ironman-navy-100 bg-white px-2 text-center font-semibold focus-ring"
                  />
                  <button
                    type="button"
                    onClick={() => updateQty(row.itemId, row.actualQuantity + 1)}
                    className="tap-target focus-ring h-9 w-9 rounded-lg border border-ironman-navy-100 bg-white text-lg font-bold text-ironman-navy"
                  >
                    +
                  </button>
                  {delta !== 0 ? (
                    <span className="ml-1 rounded-md bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-900">
                      {delta > 0 ? `+${delta}` : delta}
                    </span>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {rows.length > 0 ? (
        <div className="mt-4">
          <PhotoEvidenceField
            notes={notes}
            photoUrls={photoUrls}
            onNotesChange={setNotes}
            onPhotoUrlsChange={setPhotoUrls}
            orderId={assignment.orderId}
            assignmentId={assignment.id}
            kind="pickup"
            notesLabel={hasMismatch ? 'Mismatch reason (required when counts differ)' : 'Notes (optional)'}
            placeholder="e.g. 1 shirt left at home, customer adding next time"
            disabled={submitting}
          />
        </div>
      ) : null}

      <button
        type="button"
        onClick={submit}
        disabled={submitting || rows.length === 0 || (hasMismatch && notes.trim().length === 0)}
        className="tap-target focus-ring mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ironman-navy px-4 py-3 font-semibold text-white disabled:opacity-60"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        {submitting ? 'Saving counts…' : hasMismatch ? 'Save adjusted counts' : 'Confirm counts match'}
      </button>
    </section>
  )
}
