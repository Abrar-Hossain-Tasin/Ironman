'use client'

import { useEffect, useState } from 'react'
import { AlertOctagon, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { RequireAuth } from '@/components/auth/require-auth'
import { TableSkeleton } from '@/components/ui/skeleton'
import { apiFetch, ApiError } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { statusLabel } from '@/lib/utils'
import type { IssueResponse, IssueStatus } from '@/types'

const STATUS_TABS: { value: '' | IssueStatus; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_review', label: 'In review' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'rejected', label: 'Rejected' }
]

export function AdminIssues() {
  const token = useAuthStore((state) => state.accessToken)
  const [tab, setTab] = useState<'' | IssueStatus>('open')
  const [issues, setIssues] = useState<IssueResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [resolveOpen, setResolveOpen] = useState<IssueResponse | null>(null)
  const [resolveStatus, setResolveStatus] = useState<IssueStatus>('resolved')
  const [resolveNotes, setResolveNotes] = useState('')
  const [resolveRefund, setResolveRefund] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function load() {
    if (!token) return
    setLoading(true)
    try {
      const list = await apiFetch<IssueResponse[]>(
        tab ? `/admin/issues?status=${tab}` : '/admin/issues',
        { token }
      )
      setIssues(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load issues')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tab])

  useEffect(() => {
    if (message) toast.success(message)
  }, [message])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  function openResolve(issue: IssueResponse) {
    setResolveOpen(issue)
    setResolveStatus(issue.status === 'rejected' ? 'rejected' : 'resolved')
    setResolveNotes(issue.resolutionNotes ?? '')
    setResolveRefund(issue.refundAmount ? String(issue.refundAmount) : '')
    setError(null)
  }

  async function submitResolve() {
    if (!token || !resolveOpen) return
    setSubmitting(true)
    setError(null)
    try {
      await apiFetch<IssueResponse>(`/admin/issues/${resolveOpen.id}`, {
        method: 'PATCH',
        token,
        body: {
          status: resolveStatus,
          resolutionNotes: resolveNotes.trim() || null,
          refundAmount: resolveRefund ? Number(resolveRefund) : null
        }
      })
      setMessage(`Issue ${statusLabel(resolveStatus)} — customer notified`)
      setResolveOpen(null)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.message : err instanceof Error ? err.message : 'Could not resolve issue')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <RequireAuth roles={['admin']}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap rounded-lg border border-ironman-navy-100 bg-white p-1 text-sm shadow-soft">
          {STATUS_TABS.map((entry) => (
            <button
              key={entry.value || 'all'}
              type="button"
              onClick={() => setTab(entry.value)}
              className={`rounded-md px-3 py-1.5 font-semibold transition ${
                tab === entry.value ? 'bg-ironman-red text-white' : 'text-ironman-navy hover:bg-ironman-navy-50'
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : issues.length === 0 ? (
        <p className="rounded-lg bg-white p-5 text-sm text-gray-600 shadow-soft">No issues in this view.</p>
      ) : (
        <div className="grid gap-3">
          {issues.map((issue) => (
            <article key={issue.id} className="rounded-lg border border-ironman-navy-100 bg-white p-4 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-ironman-navy">
                      <AlertOctagon className="h-4 w-4 text-ironman-red" aria-hidden />
                      {statusLabel(issue.type)}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                        issue.status === 'open'
                          ? 'bg-ironman-red-50 text-ironman-red'
                          : issue.status === 'in_review'
                            ? 'bg-amber-100 text-amber-800'
                            : issue.status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {statusLabel(issue.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {issue.reportedByName} · order {issue.orderId.slice(0, 8)}… · {new Date(issue.createdAt).toLocaleString()}
                  </p>
                  <p className="mt-2 text-sm text-gray-700">{issue.description}</p>
                  {issue.photoUrls.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {issue.photoUrls.map((url) => (
                        <a key={url} href={url} target="_blank" rel="noreferrer" className="block h-16 w-16 overflow-hidden rounded-md border border-ironman-navy-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="evidence" className="h-full w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  ) : null}
                  {issue.resolutionNotes ? (
                    <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                      <strong>Resolution:</strong> {issue.resolutionNotes}
                      {issue.refundAmount ? ` — refund BDT ${issue.refundAmount}` : ''}
                    </p>
                  ) : null}
                </div>
                {issue.status !== 'resolved' ? (
                  <button
                    type="button"
                    onClick={() => openResolve(issue)}
                    className="tap-target focus-ring rounded-lg bg-ironman-red px-3 py-2 text-sm font-semibold text-white"
                  >
                    Resolve
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      {resolveOpen ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4" onClick={() => setResolveOpen(null)}>
          <div
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-ironman-navy">Resolve issue</h3>
            <p className="mt-1 text-sm text-gray-600">
              {statusLabel(resolveOpen.type)} reported by {resolveOpen.reportedByName}.
            </p>

            <label className="mt-4 block text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Outcome</span>
              <select
                value={resolveStatus}
                onChange={(event) => setResolveStatus(event.target.value as IssueStatus)}
                className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
              >
                <option value="in_review">Mark in review</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>

            <label className="mt-3 block text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Resolution notes (visible to customer)</span>
              <textarea
                value={resolveNotes}
                onChange={(event) => setResolveNotes(event.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 text-sm focus-ring"
                placeholder="e.g. Refunded 20% as goodwill"
              />
            </label>

            <label className="mt-3 block text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Refund amount (BDT, optional)</span>
              <input
                value={resolveRefund}
                onChange={(event) => setResolveRefund(event.target.value)}
                type="number"
                min="0"
                step="0.01"
                className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 focus-ring"
                placeholder="0"
              />
              <p className="mt-1 text-xs text-gray-500">
                This records the agreed amount on the issue. Process the actual refund on the Refunds page.
              </p>
            </label>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResolveOpen(null)}
                className="tap-target rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 text-sm font-semibold text-ironman-navy"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitResolve}
                disabled={submitting}
                className="tap-target focus-ring inline-flex items-center gap-2 rounded-lg bg-ironman-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {submitting ? 'Saving…' : 'Save resolution'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </RequireAuth>
  )
}
