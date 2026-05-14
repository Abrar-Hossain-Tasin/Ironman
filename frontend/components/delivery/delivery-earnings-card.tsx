'use client'

import { useEffect, useState } from 'react'
import { WalletCards } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { formatBdt } from '@/lib/utils'
import type { DeliveryEarningsResponse } from '@/types'

type Props = {
  token: string | null
  /** Bump this whenever the parent records a payment so we refresh in place. */
  refreshKey?: number
}

/**
 * "Today's cash on hand" card for the delivery dashboard. Defaults to today
 * (Asia/Dhaka via backend) so the agent always sees their running total at
 * a glance — no params needed.
 */
export function DeliveryEarningsCard({ token, refreshKey }: Props) {
  const [data, setData] = useState<DeliveryEarningsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)
    setError(null)
    apiFetch<DeliveryEarningsResponse>('/delivery/earnings', { token })
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load earnings')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, refreshKey])

  return (
    <section className="rounded-lg border border-ironman-navy-100 bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
            <WalletCards className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Today&apos;s cash</p>
            <p className="text-xl font-bold text-ironman-navy">
              {data ? formatBdt(Number(data.totalCollected)) : loading ? '…' : formatBdt(0)}
            </p>
          </div>
        </div>
        {data ? (
          <p className="text-right text-xs text-gray-500">
            {data.transactionCount} collection{data.transactionCount === 1 ? '' : 's'}
            <br />
            {data.from}
          </p>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-xs font-semibold text-ironman-red">{error}</p> : null}
    </section>
  )
}
