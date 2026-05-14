'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AlertOctagon, ArrowLeft, ListChecks, MapPin, WalletCards } from 'lucide-react'
import { toast } from 'sonner'
import { RequireAuth } from '@/components/auth/require-auth'
import { MetricCard } from '@/components/ui/metric-card'
import { DashboardSkeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { apiFetch, ApiError } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { formatBdt, statusLabel } from '@/lib/utils'
import type { CustomerDetailResponse } from '@/types'

type Props = {
  customerId: string
}

export function AdminCustomerDetail({ customerId }: Props) {
  const token = useAuthStore((state) => state.accessToken)
  const [data, setData] = useState<CustomerDetailResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)
    setError(null)
    apiFetch<CustomerDetailResponse>(`/admin/customers/${customerId}`, { token })
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch((err) => {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 404) {
            setError('Customer not found.')
          } else {
            setError(err instanceof Error ? err.message : 'Could not load customer')
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, customerId])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  return (
    <RequireAuth roles={['admin']}>
      <div className="mb-4">
        <Link
          href="/admin/customers"
          className="focus-ring inline-flex items-center gap-1 text-sm font-semibold text-ironman-red hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          All customers
        </Link>
      </div>

      {loading && !data ? (
        <DashboardSkeleton />
      ) : error ? (
        null
      ) : !data ? null : (
        <div className="space-y-6">
          <header className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-ironman-navy">
                  {data.fullName}
                  {!data.active ? (
                    <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                      Inactive
                    </span>
                  ) : null}
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  {data.email} · {data.phone}
                </p>
                {!data.emailVerified ? (
                  <p className="mt-1 text-xs font-semibold text-amber-700">Email not verified</p>
                ) : null}
                <p className="mt-1 text-xs text-gray-500">
                  Joined {new Date(data.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </header>

          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Orders" value={String(data.orderCount)} icon="ListChecks" tone="red" />
            <MetricCard label="Total spent" value={formatBdt(Number(data.totalSpent))} icon="WalletCards" tone="navy" />
            <MetricCard label="Total paid" value={formatBdt(Number(data.totalPaid))} icon="PackageCheck" />
            <MetricCard
              label="Open issues"
              value={String(data.openIssues)}
              icon="AlertOctagon"
              tone={data.openIssues > 0 ? 'red' : 'navy'}
            />
          </div>

          {Number(data.totalRefunded) > 0 ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
              Lifetime refunded: {formatBdt(Number(data.totalRefunded))}
            </p>
          ) : null}

          {data.addresses.length > 0 ? (
            <section className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
              <h3 className="flex items-center gap-2 text-lg font-bold text-ironman-navy">
                <MapPin className="h-5 w-5 text-ironman-red" aria-hidden />
                Saved addresses
              </h3>
              <ul className="mt-3 grid gap-2 md:grid-cols-2">
                {data.addresses.map((addr) => (
                  <li key={addr.id} className="rounded-lg bg-ironman-navy-50 p-3 text-sm">
                    <p className="font-semibold text-ironman-navy">
                      {addr.label}
                      {addr.defaultAddress ? (
                        <span className="ml-2 rounded-full bg-ironman-red px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          Default
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      {[addr.addressLine1, addr.addressLine2, addr.area, addr.city, addr.postalCode]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
            <h3 className="flex items-center gap-2 text-lg font-bold text-ironman-navy">
              <ListChecks className="h-5 w-5 text-ironman-red" aria-hidden />
              Orders
            </h3>
            {data.orders.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">No orders.</p>
            ) : (
              <ul className="mt-3 divide-y divide-ironman-navy-100">
                {data.orders.map((order) => (
                  <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <Link href={`/admin/orders/${order.id}`} className="font-semibold text-ironman-red hover:underline">
                        {order.orderNumber}
                      </Link>
                      <p className="text-xs text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString()} · {order.items.length} item
                        {order.items.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={order.status} />
                      <span className="font-semibold text-ironman-navy">{formatBdt(Number(order.totalAmount))}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
            <h3 className="flex items-center gap-2 text-lg font-bold text-ironman-navy">
              <WalletCards className="h-5 w-5 text-ironman-red" aria-hidden />
              Payments &amp; refunds
            </h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Payments</p>
                {data.payments.length === 0 ? (
                  <p className="mt-1 text-sm text-gray-500">No payments recorded.</p>
                ) : (
                  <ul className="mt-1 space-y-1 text-sm">
                    {data.payments.map((row) => (
                      <li key={row.id} className="flex items-center justify-between">
                        <span>
                          {statusLabel(row.paymentType)} · {new Date(row.collectedAt).toLocaleDateString()}
                        </span>
                        <span className="font-semibold">{formatBdt(Number(row.amount))}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Refunds</p>
                {data.refunds.length === 0 ? (
                  <p className="mt-1 text-sm text-gray-500">No refunds.</p>
                ) : (
                  <ul className="mt-1 space-y-1 text-sm">
                    {data.refunds.map((row) => (
                      <li key={row.id} className="flex items-center justify-between">
                        <span>
                          {statusLabel(row.status)} · {new Date(row.requestedAt).toLocaleDateString()}
                        </span>
                        <span className="font-semibold">{formatBdt(Number(row.amount))}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
            <h3 className="flex items-center gap-2 text-lg font-bold text-ironman-navy">
              <AlertOctagon className="h-5 w-5 text-ironman-red" aria-hidden />
              Issues
            </h3>
            {data.issues.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">No complaints recorded.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {data.issues.map((issue) => (
                  <li key={issue.id} className="rounded-lg border border-ironman-navy-100 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-ironman-navy">{statusLabel(issue.type)}</span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                          issue.status === 'open'
                            ? 'bg-ironman-red-50 text-ironman-red'
                            : issue.status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {statusLabel(issue.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{new Date(issue.createdAt).toLocaleString()}</p>
                    <p className="mt-1 text-gray-700">{issue.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </RequireAuth>
  )
}
