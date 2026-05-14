'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, RefreshCw, Search } from 'lucide-react'
import { toast } from 'sonner'
import { RequireAuth } from '@/components/auth/require-auth'
import { MetricCard } from '@/components/ui/metric-card'
import { TableSkeleton } from '@/components/ui/skeleton'
import { PaymentLedger } from '@/components/payments/payment-ledger'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { formatBdt, statusLabel } from '@/lib/utils'
import type {
  PaymentAuditEventRow,
  PaymentLedgerRow,
  PaymentReconciliationResponse,
  PaymentType,
  PaymentWebhookEventRow
} from '@/types'

const PAYMENT_TYPES: PaymentType[] = [
  'cod_pickup',
  'cod_delivery',
  'bkash_merchant',
  'nagad_merchant',
  'rocket_merchant',
  'card',
  'advance',
  'partial'
]

type VerificationFilter = '' | 'verified' | 'unverified'

function inRange(iso: string, from: string, to: string) {
  if (!from && !to) return true
  const day = iso.slice(0, 10)
  if (from && day < from) return false
  if (to && day > to) return false
  return true
}

function csvEscape(value: string | number | null | undefined) {
  const s = value == null ? '' : String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function downloadCsv(rows: PaymentLedgerRow[]) {
  const header = [
    'collectedAt',
    'orderNumber',
    'amount',
    'paymentType',
    'collector',
    'payerPhone',
    'paymentReference',
    'verified',
    'appliedToBalance',
    'verifiedAt'
  ].join(',')
  const body = rows
    .map((row) =>
      [
        row.collectedAt,
        row.orderNumber,
        row.amount,
        row.paymentType,
        row.collectedByName ?? '',
        row.payerPhone ?? '',
        row.paymentReference ?? '',
        row.verified ? 'yes' : 'no',
        row.appliedToBalance ? 'yes' : 'no',
        row.verifiedAt ?? ''
      ]
        .map(csvEscape)
        .join(',')
    )
    .join('\n')
  const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ironman-payments-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function AdminPayments() {
  const token = useAuthStore((state) => state.accessToken)
  const [payments, setPayments] = useState<PaymentLedgerRow[]>([])
  const [reconciliation, setReconciliation] = useState<PaymentReconciliationResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [paymentType, setPaymentType] = useState<PaymentType | ''>('')
  const [verification, setVerification] = useState<VerificationFilter>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  async function load() {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const [nextPayments, nextReconciliation] = await Promise.all([
        apiFetch<PaymentLedgerRow[]>('/payments', { token }),
        apiFetch<PaymentReconciliationResponse>('/payments/reconciliation', { token })
      ])
      setPayments(nextPayments)
      setReconciliation(nextReconciliation)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load payments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  async function verify(payment: PaymentLedgerRow) {
    if (!token) return
    try {
      await apiFetch<PaymentLedgerRow>(`/payments/${payment.id}/verify`, { method: 'PUT', token })
      await load()
      toast.success(`Payment ${payment.paymentReference ?? payment.orderNumber} verified`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify payment')
    }
  }

  async function retryWebhook(event: PaymentWebhookEventRow) {
    if (!token) return
    try {
      await apiFetch(`/payments/webhook-events/${event.id}/retry`, { method: 'POST', token })
      await load()
      toast.success('Webhook retry queued and processed if still valid')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not retry webhook')
    }
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return payments.filter((row) => {
      if (!inRange(row.collectedAt, from, to)) return false
      if (paymentType && row.paymentType !== paymentType) return false
      if (verification === 'verified' && !row.verified) return false
      if (verification === 'unverified' && row.verified) return false
      if (!query) return true
      return (
        row.orderNumber.toLowerCase().includes(query) ||
        (row.collectedByName ?? '').toLowerCase().includes(query) ||
        (row.payerPhone ?? '').toLowerCase().includes(query) ||
        (row.paymentReference ?? '').toLowerCase().includes(query)
      )
    })
  }, [payments, search, paymentType, verification, from, to])

  const total = filtered.reduce((sum, row) => sum + Number(row.amount), 0)
  const verifiedTotal = filtered.filter((row) => row.verified).reduce((sum, row) => sum + Number(row.amount), 0)
  const pendingCount = filtered.filter((row) => !row.verified).length
  const heldTotal = filtered.filter((row) => !row.appliedToBalance).reduce((sum, row) => sum + Number(row.amount), 0)

  return (
    <RequireAuth roles={['admin']}>
      <div className="mb-4 grid gap-4 md:grid-cols-4">
        <MetricCard label="Collected (filtered)" value={formatBdt(total)} icon="WalletCards" tone="navy" />
        <MetricCard label="Verified" value={formatBdt(verifiedTotal)} icon="Check" tone="red" />
        <MetricCard label="Awaiting verification" value={String(pendingCount)} icon="AlertOctagon" />
        <MetricCard label="Held from balance" value={formatBdt(heldTotal)} icon="Clock3" />
      </div>

      {reconciliation ? (
        <ReliabilityDashboard
          reconciliation={reconciliation}
          onRetryWebhook={retryWebhook}
        />
      ) : null}

      <div className="mb-4 grid gap-3 md:grid-cols-5">
        <label className="md:col-span-2 block">
          <span className="sr-only">Search</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              className="tap-target w-full rounded-lg border border-ironman-navy-100 bg-white pl-9 pr-3 py-2 focus-ring"
              placeholder="Order #, collector, payer phone, reference"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </label>
        <select
          className="tap-target rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 focus-ring"
          value={paymentType}
          onChange={(event) => setPaymentType(event.target.value as PaymentType | '')}
        >
          <option value="">All methods</option>
          {PAYMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {statusLabel(type)}
            </option>
          ))}
        </select>
        <select
          className="tap-target rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 focus-ring"
          value={verification}
          onChange={(event) => setVerification(event.target.value as VerificationFilter)}
        >
          <option value="">Any verification</option>
          <option value="verified">Verified only</option>
          <option value="unverified">Unverified only</option>
        </select>
        <div className="flex gap-2">
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => setFrom(event.target.value)}
            className="tap-target w-full rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 focus-ring"
            aria-label="From"
          />
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => setTo(event.target.value)}
            className="tap-target w-full rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 focus-ring"
            aria-label="To"
          />
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
        <p>
          {filtered.length} row{filtered.length === 1 ? '' : 's'} shown · {payments.length} total in ledger
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setSearch('')
              setPaymentType('')
              setVerification('')
              setFrom('')
              setTo('')
            }}
            className="tap-target rounded-lg border border-ironman-navy-100 bg-white px-3 py-1.5 font-semibold text-ironman-navy hover:bg-ironman-navy-50"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => downloadCsv(filtered)}
            disabled={filtered.length === 0}
            className="tap-target inline-flex items-center gap-1 rounded-lg bg-ironman-navy px-3 py-1.5 font-semibold text-white disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" aria-hidden /> Export CSV
          </button>
        </div>
      </div>

      {loading && payments.length === 0 ? (
        <TableSkeleton rows={6} />
      ) : (
        <PaymentLedger payments={filtered} onVerify={verify} />
      )}
    </RequireAuth>
  )
}

type ReliabilityDashboardProps = {
  reconciliation: PaymentReconciliationResponse
  onRetryWebhook: (event: PaymentWebhookEventRow) => void
}

function ReliabilityDashboard({ reconciliation, onRetryWebhook }: ReliabilityDashboardProps) {
  const retryable = reconciliation.recentWebhookEvents.filter((event) =>
    event.status === 'failed' || event.status === 'retry_scheduled'
  )

  return (
    <section className="mb-6 space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Ledger total"
          value={formatBdt(Number(reconciliation.ledgerTotal))}
          icon="WalletCards"
          tone="navy"
        />
        <MetricCard
          label="Unverified total"
          value={formatBdt(Number(reconciliation.unverifiedTotal))}
          icon="Clock3"
        />
        <MetricCard
          label="Webhook retry queue"
          value={String(reconciliation.retryScheduledWebhookCount)}
          icon="RefreshCw"
        />
        <MetricCard
          label="Failed webhooks"
          value={String(reconciliation.failedWebhookCount)}
          icon="AlertOctagon"
          tone={reconciliation.failedWebhookCount > 0 ? 'red' : 'plain'}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]">
        <div className="rounded-lg border border-ironman-navy-100 bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-ironman-navy">Provider settlement</h2>
              <p className="text-xs text-gray-500">
                Generated {new Date(reconciliation.generatedAt).toLocaleString()}
              </p>
            </div>
            <span className="rounded-full bg-ironman-navy-50 px-3 py-1 text-xs font-semibold text-ironman-navy">
              {reconciliation.paymentCount} payments
            </span>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[620px] w-full text-sm">
              <thead className="bg-ironman-navy text-white">
                <tr>
                  <th className="px-3 py-3 text-left">Provider</th>
                  <th className="px-3 py-3 text-left">Total</th>
                  <th className="px-3 py-3 text-left">Verified</th>
                  <th className="px-3 py-3 text-left">Rows</th>
                  <th className="px-3 py-3 text-left">Held</th>
                </tr>
              </thead>
              <tbody>
                {reconciliation.providerSummaries.map((row, index) => (
                  <tr key={row.provider} className={index % 2 === 0 ? 'bg-white' : 'bg-ironman-navy-50'}>
                    <td className="px-3 py-3 font-semibold text-ironman-navy">{statusLabel(row.provider)}</td>
                    <td className="px-3 py-3">{formatBdt(Number(row.total))}</td>
                    <td className="px-3 py-3">{formatBdt(Number(row.verifiedTotal))}</td>
                    <td className="px-3 py-3">{row.paymentCount}</td>
                    <td className="px-3 py-3">{row.unappliedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <WebhookEventsTable events={reconciliation.recentWebhookEvents} retryable={retryable} onRetry={onRetryWebhook} />
      </div>

      <PaymentAuditTable events={reconciliation.recentAuditEvents} />
    </section>
  )
}

function WebhookEventsTable({
  events,
  retryable,
  onRetry
}: {
  events: PaymentWebhookEventRow[]
  retryable: PaymentWebhookEventRow[]
  onRetry: (event: PaymentWebhookEventRow) => void
}) {
  return (
    <div className="rounded-lg border border-ironman-navy-100 bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-ironman-navy">Webhook events</h2>
          <p className="text-xs text-gray-500">{retryable.length} retryable event{retryable.length === 1 ? '' : 's'}</p>
        </div>
      </div>
      <div className="mt-4 max-h-[360px] overflow-auto">
        <table className="min-w-[760px] w-full text-sm">
          <thead className="bg-ironman-navy text-white">
            <tr>
              <th className="px-3 py-3 text-left">Provider</th>
              <th className="px-3 py-3 text-left">Status</th>
              <th className="px-3 py-3 text-left">Order</th>
              <th className="px-3 py-3 text-left">Attempts</th>
              <th className="px-3 py-3 text-left">Next retry</th>
              <th className="px-3 py-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event, index) => (
              <tr key={event.id} className={index % 2 === 0 ? 'bg-white' : 'bg-ironman-navy-50'}>
                <td className="px-3 py-3 font-semibold text-ironman-navy">{statusLabel(event.provider)}</td>
                <td className="px-3 py-3">{statusLabel(event.status)}</td>
                <td className="px-3 py-3">{event.orderNumber ?? '-'}</td>
                <td className="px-3 py-3">{event.attemptCount}</td>
                <td className="px-3 py-3">{event.nextRetryAt ? new Date(event.nextRetryAt).toLocaleString() : '-'}</td>
                <td className="px-3 py-3">
                  {event.status === 'failed' || event.status === 'retry_scheduled' ? (
                    <button
                      type="button"
                      onClick={() => onRetry(event)}
                      className="tap-target inline-flex items-center gap-1 rounded-lg bg-ironman-navy px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Retry
                    </button>
                  ) : (
                    <span className="text-xs text-gray-500">Closed</span>
                  )}
                </td>
              </tr>
            ))}
            {events.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-sm text-gray-500" colSpan={6}>No webhook events yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PaymentAuditTable({ events }: { events: PaymentAuditEventRow[] }) {
  return (
    <div className="rounded-lg border border-ironman-navy-100 bg-white p-4 shadow-soft">
      <h2 className="font-bold text-ironman-navy">Payment audit trail</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-ironman-navy text-white">
            <tr>
              <th className="px-3 py-3 text-left">Time</th>
              <th className="px-3 py-3 text-left">Order</th>
              <th className="px-3 py-3 text-left">Actor</th>
              <th className="px-3 py-3 text-left">Action</th>
              <th className="px-3 py-3 text-left">Status</th>
              <th className="px-3 py-3 text-left">Paid amount</th>
              <th className="px-3 py-3 text-left">Notes</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event, index) => (
              <tr key={event.id} className={index % 2 === 0 ? 'bg-white' : 'bg-ironman-navy-50'}>
                <td className="px-3 py-3">{new Date(event.createdAt).toLocaleString()}</td>
                <td className="px-3 py-3 font-semibold text-ironman-navy">{event.orderNumber}</td>
                <td className="px-3 py-3">{event.actorName ?? statusLabel(event.actorType)}</td>
                <td className="px-3 py-3">{statusLabel(event.action)}</td>
                <td className="px-3 py-3">
                  {event.previousPaymentStatus ? statusLabel(event.previousPaymentStatus) : '-'} {'->'} {event.newPaymentStatus ? statusLabel(event.newPaymentStatus) : '-'}
                </td>
                <td className="px-3 py-3">
                  {formatBdt(Number(event.previousPaidAmount ?? 0))} {'->'} {formatBdt(Number(event.newPaidAmount ?? 0))}
                </td>
                <td className="px-3 py-3 text-gray-600">{event.notes ?? '-'}</td>
              </tr>
            ))}
            {events.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-sm text-gray-500" colSpan={7}>No payment audit events yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
