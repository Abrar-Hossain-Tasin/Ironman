'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { RequireAuth } from '@/components/auth/require-auth'
import { TableSkeleton } from '@/components/ui/skeleton'
import { apiFetch, ApiError } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { formatBdt } from '@/lib/utils'
import type { CouponResponse, DiscountType } from '@/types'

type DraftCoupon = {
  id?: string
  code: string
  description: string
  discountType: DiscountType
  discountValue: string
  minOrderAmount: string
  maxDiscountAmount: string
  validFrom: string
  validTo: string
  maxUses: string
  maxUsesPerUser: string
  active: boolean
}

const emptyDraft: DraftCoupon = {
  code: '',
  description: '',
  discountType: 'percent',
  discountValue: '',
  minOrderAmount: '',
  maxDiscountAmount: '',
  validFrom: '',
  validTo: '',
  maxUses: '',
  maxUsesPerUser: '1',
  active: true
}

function toDraft(coupon: CouponResponse): DraftCoupon {
  return {
    id: coupon.id,
    code: coupon.code,
    description: coupon.description ?? '',
    discountType: coupon.discountType,
    discountValue: String(coupon.discountValue),
    minOrderAmount: coupon.minOrderAmount != null ? String(coupon.minOrderAmount) : '',
    maxDiscountAmount: coupon.maxDiscountAmount != null ? String(coupon.maxDiscountAmount) : '',
    validFrom: coupon.validFrom ? coupon.validFrom.slice(0, 16) : '',
    validTo: coupon.validTo ? coupon.validTo.slice(0, 16) : '',
    maxUses: coupon.maxUses != null ? String(coupon.maxUses) : '',
    maxUsesPerUser: String(coupon.maxUsesPerUser ?? 1),
    active: coupon.active
  }
}

function toBody(draft: DraftCoupon) {
  return {
    code: draft.code.trim().toUpperCase(),
    description: draft.description.trim() || null,
    discountType: draft.discountType,
    discountValue: Number(draft.discountValue),
    minOrderAmount: draft.minOrderAmount ? Number(draft.minOrderAmount) : null,
    maxDiscountAmount: draft.maxDiscountAmount ? Number(draft.maxDiscountAmount) : null,
    validFrom: draft.validFrom ? new Date(draft.validFrom).toISOString() : null,
    validTo: draft.validTo ? new Date(draft.validTo).toISOString() : null,
    maxUses: draft.maxUses ? Number(draft.maxUses) : null,
    maxUsesPerUser: draft.maxUsesPerUser ? Number(draft.maxUsesPerUser) : 1,
    active: draft.active
  }
}

export function AdminCoupons() {
  const token = useAuthStore((state) => state.accessToken)
  const [coupons, setCoupons] = useState<CouponResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState<DraftCoupon>(emptyDraft)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    if (!token) return
    setLoading(true)
    try {
      setCoupons(await apiFetch<CouponResponse[]>('/admin/coupons', { token }))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    if (message) toast.success(message)
  }, [message])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return
    setSubmitting(true)
    setError(null)
    setMessage(null)
    try {
      const body = toBody(draft)
      if (!body.code || body.discountValue <= 0) {
        setError('Code and a positive discount value are required.')
        return
      }
      if (draft.id) {
        await apiFetch(`/admin/coupons/${draft.id}`, { method: 'PUT', token, body })
        setMessage(`Coupon ${body.code} updated`)
      } else {
        await apiFetch('/admin/coupons', { method: 'POST', token, body })
        setMessage(`Coupon ${body.code} created`)
      }
      setDraft(emptyDraft)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.message : err instanceof Error ? err.message : 'Could not save coupon')
    } finally {
      setSubmitting(false)
    }
  }

  async function deactivate(coupon: CouponResponse) {
    if (!token) return
    if (!confirm(`Deactivate coupon ${coupon.code}? It will no longer apply to new orders.`)) return
    try {
      await apiFetch(`/admin/coupons/${coupon.id}`, { method: 'DELETE', token })
      setMessage(`${coupon.code} deactivated`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not deactivate')
    }
  }

  return (
    <RequireAuth roles={['admin']}>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section>
          <header className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-ironman-navy">Coupons ({coupons.length})</h2>
          </header>

          {loading ? (
            <TableSkeleton rows={6} />
          ) : coupons.length === 0 ? (
            <p className="rounded-lg bg-white p-5 text-sm text-gray-600 shadow-soft">
              No coupons yet. Use the form to create one.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-ironman-navy-100 bg-white shadow-soft">
              <table className="w-full text-sm">
                <thead className="bg-ironman-navy-50 text-left text-xs uppercase text-gray-600">
                  <tr>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Discount</th>
                    <th className="px-3 py-2">Min order</th>
                    <th className="px-3 py-2">Uses</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((coupon) => (
                    <tr key={coupon.id} className="border-t border-ironman-navy-100">
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => setDraft(toDraft(coupon))}
                          className="font-bold text-ironman-red hover:underline"
                        >
                          {coupon.code}
                        </button>
                        {coupon.description ? (
                          <p className="text-xs text-gray-500">{coupon.description}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        {coupon.discountType === 'percent'
                          ? `${coupon.discountValue}%`
                          : formatBdt(coupon.discountValue)}
                        {coupon.maxDiscountAmount ? (
                          <p className="text-xs text-gray-500">cap {formatBdt(coupon.maxDiscountAmount)}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">{coupon.minOrderAmount ? formatBdt(coupon.minOrderAmount) : '—'}</td>
                      <td className="px-3 py-2">
                        {coupon.currentUses}
                        {coupon.maxUses ? ` / ${coupon.maxUses}` : ''}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                            coupon.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {coupon.active ? 'active' : 'inactive'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => deactivate(coupon)}
                          aria-label="Deactivate"
                          className="focus-ring rounded-md p-1 text-ironman-red hover:bg-ironman-red-50"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside>
          <form className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft" onSubmit={submit}>
            <h2 className="flex items-center gap-2 text-lg font-bold text-ironman-navy">
              <Plus className="h-5 w-5 text-ironman-red" aria-hidden />
              {draft.id ? `Edit ${draft.code}` : 'Create coupon'}
            </h2>

            <label className="mt-4 block text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Code</span>
              <input
                value={draft.code}
                onChange={(event) => setDraft({ ...draft, code: event.target.value })}
                required
                placeholder="SUMMER25"
                className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 font-mono uppercase focus-ring"
              />
            </label>

            <label className="mt-3 block text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Description (optional)</span>
              <input
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
              />
            </label>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="block text-sm">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Type</span>
                <select
                  value={draft.discountType}
                  onChange={(event) => setDraft({ ...draft, discountType: event.target.value as DiscountType })}
                  className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
                >
                  <option value="percent">Percent</option>
                  <option value="fixed">Fixed amount</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Value</span>
                <input
                  value={draft.discountValue}
                  onChange={(event) => setDraft({ ...draft, discountValue: event.target.value })}
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
                />
              </label>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="block text-sm">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Min order</span>
                <input
                  value={draft.minOrderAmount}
                  onChange={(event) => setDraft({ ...draft, minOrderAmount: event.target.value })}
                  type="number"
                  min="0"
                  className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
                />
              </label>
              <label className="block text-sm">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Max discount</span>
                <input
                  value={draft.maxDiscountAmount}
                  onChange={(event) => setDraft({ ...draft, maxDiscountAmount: event.target.value })}
                  type="number"
                  min="0"
                  className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
                />
              </label>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="block text-sm">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Valid from</span>
                <input
                  value={draft.validFrom}
                  onChange={(event) => setDraft({ ...draft, validFrom: event.target.value })}
                  type="datetime-local"
                  className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
                />
              </label>
              <label className="block text-sm">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Valid to</span>
                <input
                  value={draft.validTo}
                  onChange={(event) => setDraft({ ...draft, validTo: event.target.value })}
                  type="datetime-local"
                  className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
                />
              </label>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="block text-sm">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Max uses</span>
                <input
                  value={draft.maxUses}
                  onChange={(event) => setDraft({ ...draft, maxUses: event.target.value })}
                  type="number"
                  min="1"
                  placeholder="∞"
                  className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
                />
              </label>
              <label className="block text-sm">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Per customer</span>
                <input
                  value={draft.maxUsesPerUser}
                  onChange={(event) => setDraft({ ...draft, maxUsesPerUser: event.target.value })}
                  type="number"
                  min="1"
                  className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
                />
              </label>
            </div>

            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(event) => setDraft({ ...draft, active: event.target.checked })}
                className="h-4 w-4 rounded border-ironman-navy-100 text-ironman-red focus-ring"
              />
              <span className="font-semibold text-ironman-navy">Active</span>
            </label>

            <div className="mt-4 flex gap-2">
              {draft.id ? (
                <button
                  type="button"
                  onClick={() => setDraft(emptyDraft)}
                  className="tap-target flex-1 rounded-lg border border-ironman-navy-100 bg-white px-4 py-2 font-semibold text-ironman-navy"
                >
                  Cancel edit
                </button>
              ) : null}
              <button
                type="submit"
                disabled={submitting}
                className="tap-target focus-ring flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-ironman-red px-4 py-2 font-semibold text-white disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {submitting ? 'Saving…' : draft.id ? 'Update coupon' : 'Create coupon'}
              </button>
            </div>
          </form>
        </aside>
      </div>
    </RequireAuth>
  )
}
