'use client'

import { useEffect, useState } from 'react'
import { Loader2, Star } from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { apiFetch, ApiError } from '@/lib/api'
import type { OrderResponse, ReviewResponse } from '@/types'

type OrderReviewPanelProps = {
  order: OrderResponse
  token: string | null
}

export function OrderReviewPanel({ order, token }: OrderReviewPanelProps) {
  const [existing, setExisting] = useState<ReviewResponse | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [overall, setOverall] = useState(0)
  const [serviceRating, setServiceRating] = useState(0)
  const [deliveryRating, setDeliveryRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const eligible = order.status === 'delivered'

  useEffect(() => {
    if (!token || !eligible) {
      setLoaded(true)
      return
    }
    let cancelled = false
    apiFetch<ReviewResponse>(`/orders/${order.id}/review`, { token })
      .then((res) => {
        if (cancelled) return
        setExisting(res)
        setOverall(res.overallRating)
        setServiceRating(res.serviceRating ?? 0)
        setDeliveryRating(res.deliveryRating ?? 0)
        setComment(res.comment ?? '')
      })
      .catch((err) => {
        // 404 is expected if not yet reviewed.
        if (err instanceof ApiError && err.status !== 404) setError(err.detail || err.message)
      })
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [token, order.id, eligible])

  useEffect(() => {
    if (message) toast.success(message)
  }, [message])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  if (!eligible) return null

  async function submit() {
    if (!token) return
    if (overall < 1) {
      setError('Tap an overall rating to continue.')
      return
    }
    setSubmitting(true)
    setError(null)
    setMessage(null)
    try {
      const res = await apiFetch<ReviewResponse>(`/orders/${order.id}/review`, {
        method: 'POST',
        token,
        body: {
          overallRating: overall,
          serviceRating: serviceRating || null,
          deliveryRating: deliveryRating || null,
          comment: comment.trim() || null
        }
      })
      setExisting(res)
      setMessage('Thanks for the feedback!')
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail || err.message : err instanceof Error ? err.message : 'Could not submit review'
      setError(msg || 'Could not submit review')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
      <h2 className="flex items-center gap-2 text-lg font-bold text-ironman-navy">
        <Star className="h-5 w-5 text-ironman-red" aria-hidden />
        Rate your order
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        {existing ? 'Your review is below. You can update it any time.' : 'How did we do? Your rating shapes how we train our team.'}
      </p>

      {!loaded ? (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          <StarRow label="Overall" value={overall} onChange={setOverall} />
          <StarRow label="Service quality" value={serviceRating} onChange={setServiceRating} />
          <StarRow label="Delivery experience" value={deliveryRating} onChange={setDeliveryRating} />

          <label>
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Comment (optional)</span>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="mt-1 min-h-20 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
              placeholder="What stood out? Anything we should keep doing — or stop?"
            />
          </label>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="tap-target focus-ring inline-flex items-center gap-2 rounded-lg bg-ironman-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {submitting ? 'Saving…' : existing ? 'Update review' : 'Submit review'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

function StarRow({ label, value, onChange }: { label: string; value: number; onChange: (next: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2">
      <span className="text-sm font-semibold text-ironman-navy">{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = n <= value
          return (
            <button
              key={n}
              type="button"
              aria-label={`${label}: ${n} star${n === 1 ? '' : 's'}`}
              onClick={() => onChange(n === value ? 0 : n)}
              className="focus-ring rounded p-1"
            >
              <Star className={`h-5 w-5 ${filled ? 'fill-ironman-red text-ironman-red' : 'text-gray-300'}`} aria-hidden />
            </button>
          )
        })}
      </div>
    </div>
  )
}
