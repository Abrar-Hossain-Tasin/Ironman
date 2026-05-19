'use client'

import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { AlertOctagon, Truck, Wallet } from 'lucide-react'
import { cn, formatBdt } from '@/lib/utils'
import type { OrderResponse, PaymentLedgerRow } from '@/types'

type Props = {
  orders: OrderResponse[]
  payments: PaymentLedgerRow[]
}

const NAVY = '#1B2444'
const RED = '#D81B2A'
const AMBER = '#F59E0B'
const EMERALD = '#10B981'

const WASH_STAGES = [
  { label: 'Pickup', statuses: ['pickup_assigned', 'picked_up'] as const },
  { label: 'Wash', statuses: ['in_wash', 'wash_complete'] as const },
  { label: 'Dry-clean', statuses: ['in_dry_clean', 'dry_clean_complete'] as const },
  { label: 'Iron', statuses: ['waiting_for_iron', 'in_iron', 'iron_complete'] as const },
  { label: 'Dispatch', statuses: ['ready', 'delivery_assigned', 'out_for_delivery'] as const }
]

const BOTTLENECK_STATUSES: OrderResponse['status'][] = [
  'delivery_failed',
  'returned',
  'disputed'
]

function startOfDayMs(offsetDays: number) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + offsetDays)
  return d.getTime()
}

function WidgetCard({
  title,
  hint,
  icon,
  iconTone = 'text-ironman-navy',
  children
}: {
  title: string
  hint: string
  icon: React.ReactNode
  iconTone?: string
  children: React.ReactNode
}) {
  return (
    <section className="flex h-full flex-col rounded-xl border border-ironman-navy-100 bg-white p-4 shadow-soft">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ironman-navy/60">
            {title}
          </p>
          <p className="mt-1 text-xs text-gray-500">{hint}</p>
        </div>
        <span className={cn('rounded-full bg-ironman-navy-50 p-2', iconTone)}>{icon}</span>
      </header>
      <div className="mt-3 flex-1">{children}</div>
    </section>
  )
}

export function PulseWidgets({ orders, payments }: Props) {
  // ── Active Wash Load: counts per pipeline stage right now. ─────────────
  const washLoad = useMemo(() => {
    return WASH_STAGES.map((stage) => ({
      stage: stage.label,
      count: orders.filter((o) => (stage.statuses as readonly string[]).includes(o.status)).length
    }))
  }, [orders])

  const activeLoadTotal = washLoad.reduce((sum, row) => sum + row.count, 0)

  // ── Today's Revenue: 7-day sparkline with today highlighted. ───────────
  const revenueSeries = useMemo(() => {
    const days = Array.from({ length: 7 }).map((_, idx) => {
      const dayStart = startOfDayMs(-6 + idx)
      const dayEnd = dayStart + 24 * 60 * 60 * 1000
      const total = payments.reduce((sum, p) => {
        const t = new Date(p.collectedAt).getTime()
        if (Number.isNaN(t)) return sum
        if (t >= dayStart && t < dayEnd) return sum + Number(p.amount || 0)
        return sum
      }, 0)
      return {
        day: new Date(dayStart).toLocaleDateString(undefined, { weekday: 'short' }),
        amount: total,
        isToday: idx === 6
      }
    })
    return days
  }, [payments])

  const todaysRevenue = revenueSeries[revenueSeries.length - 1]?.amount ?? 0

  // ── Delivery Bottlenecks: failed / returned / disputed by status. ──────
  const bottlenecks = useMemo(
    () =>
      BOTTLENECK_STATUSES.map((status) => ({
        status: status.replace(/_/g, ' '),
        count: orders.filter((o) => o.status === status).length,
        tone: status === 'delivery_failed' ? RED : status === 'returned' ? AMBER : NAVY
      })),
    [orders]
  )

  const bottleneckTotal = bottlenecks.reduce((sum, row) => sum + row.count, 0)

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <WidgetCard
        title="Active wash load"
        hint={`${activeLoadTotal} orders currently in production`}
        icon={<Truck className="h-4 w-4" aria-hidden />}
      >
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={washLoad} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
              <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#E5E7EB" />
              <XAxis
                dataKey="stage"
                tick={{ fontSize: 10, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: 'rgba(27, 36, 68, 0.05)' }}
                contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: '#E5E7EB' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} fill={NAVY} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </WidgetCard>

      <WidgetCard
        title="Today's revenue"
        hint={`${formatBdt(todaysRevenue)} collected so far`}
        icon={<Wallet className="h-4 w-4" aria-hidden />}
        iconTone="text-emerald-600"
      >
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueSeries} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
              <defs>
                <linearGradient id="pulseRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={EMERALD} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={EMERALD} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#E5E7EB" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                cursor={{ stroke: EMERALD, strokeOpacity: 0.4 }}
                contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: '#E5E7EB' }}
                formatter={(value: number) => [formatBdt(value), 'Revenue']}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke={EMERALD}
                strokeWidth={2}
                fill="url(#pulseRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </WidgetCard>

      <WidgetCard
        title="Delivery bottlenecks"
        hint={
          bottleneckTotal === 0
            ? 'No exceptions right now — clean board.'
            : `${bottleneckTotal} order${bottleneckTotal === 1 ? '' : 's'} need attention`
        }
        icon={<AlertOctagon className="h-4 w-4" aria-hidden />}
        iconTone={bottleneckTotal > 0 ? 'text-ironman-red' : 'text-ironman-navy'}
      >
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={bottlenecks}
              layout="vertical"
              margin={{ top: 0, right: 8, bottom: 0, left: 8 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="status"
                tick={{ fontSize: 10, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <Tooltip
                cursor={{ fill: 'rgba(216, 27, 42, 0.05)' }}
                contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: '#E5E7EB' }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {bottlenecks.map((entry, idx) => (
                  <Cell key={idx} fill={entry.tone} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </WidgetCard>
    </div>
  )
}
