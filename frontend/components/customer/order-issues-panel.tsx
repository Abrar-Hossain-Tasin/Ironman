'use client'

import { useEffect, useState } from 'react'
import { AlertOctagon, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { apiFetch, ApiError } from '@/lib/api'
import { PhotoEvidenceField } from '@/components/tasks/photo-evidence-field'
import { statusLabel } from '@/lib/utils'
import type { IssueResponse, IssueType, OrderResponse, OrderStatus } from '@/types'

const issueTypes: { value: IssueType; label: string; help: string }[] = [
  { value: 'damaged', label: 'Damaged item', help: 'Hole, stain, color bleed, or torn fabric' },
  { value: 'missing', label: 'Missing item', help: 'An item from your order didn’t arrive' },
  { value: 'wrong_item', label: 'Wrong item', help: 'You received something that isn’t yours' },
  { value: 'late', label: 'Late delivery', help: 'Order arrived outside the agreed window' },
  { value: 'other', label: 'Other issue', help: 'Anything else we should look at' }
]

const eligibleStatuses: OrderStatus[] = [
  'picked_up', 'in_wash', 'wash_complete', 'in_dry_clean', 'dry_clean_complete',
  'waiting_for_iron', 'in_iron', 'iron_complete', 'ready',
  'delivery_assigned', 'out_for_delivery', 'delivered', 'delivery_failed', 'returned', 'disputed'
]

type OrderIssuesPanelProps = {
  order: OrderResponse
  token: string | null
}

export function OrderIssuesPanel({ order, token }: OrderIssuesPanelProps) {
  const [issues, setIssues] = useState<IssueResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<IssueType>('damaged')
  const [description, setDescription] = useState('')
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reportable = eligibleStatuses.includes(order.status)

  async function load() {
    if (!token) return
    setLoading(true)
    try {
      const list = await apiFetch<IssueResponse[]>(`/orders/${order.id}/issues`, { token })
      setIssues(list)
    } catch {
      // Endpoint may 403 for non-owners; ignore silently.
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, order.id])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  async function submit() {
    if (!token) return
    if (description.trim().length < 5) {
      setError('Tell us a bit more — at least 5 characters.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const created = await apiFetch<IssueResponse>(`/orders/${order.id}/issues`, {
        method: 'POST',
        token,
        body: {
          type,
          description: description.trim(),
          photoUrls
        }
      })
      setIssues((current) => [created, ...current])
      setDescription('')
      setPhotoUrls([])
      setOpen(false)
      toast.success('Issue submitted')
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail || err.message : err instanceof Error ? err.message : 'Could not submit issue'
      setError(msg || 'Could not submit issue')
    } finally {
      setSubmitting(false)
    }
  }

  if (!reportable && !issues.length) return null

  return (
    <section className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-ironman-navy">
            <AlertOctagon className="h-5 w-5 text-ironman-red" aria-hidden />
            Issues &amp; complaints
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Damaged, missing, or wrong items? Tell us within 48 hours of delivery for the fastest resolution.
          </p>
        </div>
        {reportable ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="tap-target focus-ring inline-flex items-center gap-1 rounded-lg bg-ironman-navy px-3 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Report an issue
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="mt-4 grid gap-3 rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 p-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Issue type</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {issueTypes.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  className={`focus-ring rounded-lg border p-3 text-left text-sm transition ${type === opt.value ? 'border-ironman-red bg-white' : 'border-ironman-navy-100 bg-white/60'}`}
                >
                  <p className="font-semibold text-ironman-navy">{opt.label}</p>
                  <p className="text-xs text-gray-600">{opt.help}</p>
                </button>
              ))}
            </div>
          </div>

          <PhotoEvidenceField
            notes={description}
            photoUrls={photoUrls}
            onNotesChange={setDescription}
            onPhotoUrlsChange={setPhotoUrls}
            orderId={order.id}
            kind="issue"
            notesLabel="Describe what happened"
            placeholder="A small tear on the collar; missing 1 shirt; etc."
            disabled={submitting}
          />

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="tap-target rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 text-sm font-semibold text-ironman-navy">
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="tap-target focus-ring inline-flex items-center gap-2 rounded-lg bg-ironman-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {submitting ? 'Submitting…' : 'Submit issue'}
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : issues.length ? (
          issues.map((issue) => (
            <article key={issue.id} className="rounded-lg border border-ironman-navy-100 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-ironman-navy-50 px-2 py-0.5 text-xs font-semibold text-ironman-navy">
                    {statusLabel(issue.type)}
                  </span>
                  <span className="rounded-md bg-ironman-red-50 px-2 py-0.5 text-xs font-semibold text-ironman-red">
                    {statusLabel(issue.status)}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{new Date(issue.createdAt).toLocaleString()}</p>
              </div>
              <p className="mt-2 text-sm text-gray-700">{issue.description}</p>
              {issue.photoUrls.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {issue.photoUrls.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <a key={url} href={url} target="_blank" rel="noreferrer" className="block h-16 w-16 overflow-hidden rounded-md border border-ironman-navy-100">
                      <img src={url} alt="evidence" className="h-full w-full object-cover" />
                    </a>
                  ))}
                </div>
              ) : null}
              {issue.resolutionNotes ? (
                <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                  <strong>Resolution:</strong> {issue.resolutionNotes}
                </p>
              ) : null}
            </article>
          ))
        ) : (
          <p className="text-sm text-gray-500">No issues reported on this order.</p>
        )}
      </div>
    </section>
  )
}
