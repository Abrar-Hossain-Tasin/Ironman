'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RequireAuth } from '@/components/auth/require-auth'
import { MetricCard } from '@/components/ui/metric-card'
import { DashboardSkeleton } from '@/components/ui/skeleton'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { formatBdt } from '@/lib/utils'
import type { ReportSummaryResponse } from '@/types'

const WINDOW_OPTIONS: { key: string; days: number; label: string }[] = [
  { key: '7', days: 7, label: 'Last 7 days' },
  { key: '30', days: 30, label: 'Last 30 days' },
  { key: '90', days: 90, label: 'Last 90 days' },
  { key: '365', days: 365, label: 'Last year' }
]

export function AdminReports() {
  const token = useAuthStore((state) => state.accessToken)
  const [windowKey, setWindowKey] = useState('30')
  const [data, setData] = useState<ReportSummaryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const days = useMemo(
    () => WINDOW_OPTIONS.find((opt) => opt.key === windowKey)?.days ?? 30,
    [windowKey]
  )

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)
    setError(null)
    apiFetch<ReportSummaryResponse>(`/admin/reports/summary?window=${days}`, { token })
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load report')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, days])

  return (
    <RequireAuth roles={['admin']}>
      <div className="mb-4 inline-flex flex-wrap rounded-lg border border-ironman-navy-100 bg-white p-1 text-sm shadow-soft">
        {WINDOW_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setWindowKey(opt.key)}
            className={`rounded-md px-3 py-1.5 font-semibold transition ${
              windowKey === opt.key ? 'bg-ironman-red text-white' : 'text-ironman-navy hover:bg-ironman-navy-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading && !data ? <DashboardSkeleton /> : null}
      {data ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Orders" value={String(data.orderCount)} icon="ListChecks" tone="red" />
            <MetricCard label="Gross revenue" value={formatBdt(Number(data.grossRevenue))} icon="WalletCards" tone="navy" />
            <MetricCard label="Refunded" value={formatBdt(Number(data.refundedAmount))} icon="WalletCards" />
            <MetricCard label="Net revenue" value={formatBdt(Number(data.netRevenue))} icon="PackageCheck" tone="navy" />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Average order value"
              value={formatBdt(Math.round(Number(data.averageOrderValue)))}
              icon="WalletCards"
            />
            <MetricCard
              label="Delivery success rate"
              value={data.deliverySuccessPct == null ? '—' : `${data.deliverySuccessPct.toFixed(1)}%`}
              icon="Truck"
              tone={data.deliverySuccessPct != null && data.deliverySuccessPct >= 95 ? 'navy' : 'red'}
            />
            <MetricCard label="Failed orders" value={String(data.failedCount)} icon="AlertOctagon" />
          </div>

          <Sparkline daily={data.daily} />

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <section className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
              <h3 className="text-lg font-bold text-ironman-navy">Top services</h3>
              {data.topServices.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">No items in window.</p>
              ) : (
                <ol className="mt-3 space-y-2 text-sm">
                  {data.topServices.map((row, index) => (
                    <li key={row.name} className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-ironman-navy">
                        {index + 1}. {row.name}
                      </span>
                      <span className="text-gray-600">
                        {row.quantity} item{row.quantity === 1 ? '' : 's'}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
              <h3 className="text-lg font-bold text-ironman-navy">Cash collectors</h3>
              {data.topCollectors.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">No collections in window.</p>
              ) : (
                <ol className="mt-3 space-y-2 text-sm">
                  {data.topCollectors.map((row, index) => (
                    <li key={row.name + index} className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-ironman-navy">
                        {index + 1}. {row.name}
                      </span>
                      <span className="text-gray-600">
                        {formatBdt(Number(row.total))} · {row.count} tx
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </>
      ) : null}
    </RequireAuth>
  )
}

/**
 * Lightweight inline-SVG sparkline for daily revenue + orders. Hand-rolled
 * instead of pulling in Recharts — keeps the bundle lean and gives precise
 * control over the small "two-axis on one chart" presentation we want here.
 */
function Sparkline({ daily }: { daily: ReportSummaryResponse['daily'] }) {
  if (daily.length === 0) return null
  const width = 800
  const height = 160
  const padX = 24
  const padY = 16
  const innerW = width - padX * 2
  const innerH = height - padY * 2

  const maxRevenue = Math.max(1, ...daily.map((d) => Number(d.revenue)))
  const maxOrders = Math.max(1, ...daily.map((d) => d.orders))
  const stepX = daily.length > 1 ? innerW / (daily.length - 1) : 0

  const revenuePath = daily
    .map((d, index) => {
      const x = padX + index * stepX
      const y = padY + innerH - (Number(d.revenue) / maxRevenue) * innerH
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')

  const ordersBarWidth = Math.max(2, stepX * 0.5)

  return (
    <section className="mt-6 rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-ironman-navy">Daily trend</h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-4 rounded-full bg-ironman-red" />
            Revenue
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-4 rounded-full bg-ironman-navy/30" />
            Orders
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 w-full" role="img" aria-label="Daily revenue and order count">
        {daily.map((d, index) => {
          const x = padX + index * stepX - ordersBarWidth / 2
          const barH = (d.orders / maxOrders) * innerH
          return (
            <rect
              key={d.date}
              x={x}
              y={padY + innerH - barH}
              width={ordersBarWidth}
              height={barH}
              fill="rgba(27, 36, 84, 0.18)"
            >
              <title>{`${d.date}: ${d.orders} order${d.orders === 1 ? '' : 's'}`}</title>
            </rect>
          )
        })}
        <path d={revenuePath} fill="none" stroke="#D81B2A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {daily.map((d, index) => {
          const x = padX + index * stepX
          const y = padY + innerH - (Number(d.revenue) / maxRevenue) * innerH
          return (
            <circle key={d.date + '-dot'} cx={x} cy={y} r={2.5} fill="#D81B2A">
              <title>{`${d.date}: ${formatBdt(Number(d.revenue))}`}</title>
            </circle>
          )
        })}
      </svg>
      <p className="mt-2 text-xs text-gray-500">
        {daily[0].date} → {daily[daily.length - 1].date} · peak {formatBdt(Math.round(maxRevenue))} / day
      </p>
    </section>
  )
}
