'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Download,
  Droplets,
  Grid2X2,
  List,
  MapPin,
  RefreshCw,
  Search,
  Shirt,
  SlidersHorizontal,
  Sparkles,
  Truck,
  UserRound,
  WalletCards,
  XCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { AdminLiveLocations } from '@/components/admin/admin-live-locations'
import { RequireAuth } from '@/components/auth/require-auth'
import { StatusBadge } from '@/components/ui/status-badge'
import { CardSkeleton, TableSkeleton } from '@/components/ui/skeleton'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { downloadCsv } from '@/lib/csv'
import { assignmentCustomerName } from '@/lib/mappers'
import { cn, formatBdt, statusLabel } from '@/lib/utils'
import type { Assignment, AssignmentStatus, AssignmentType } from '@/types'

const TYPE_OPTIONS: AssignmentType[] = ['pickup', 'delivery', 'wash', 'iron', 'dry_clean']
const STATUS_OPTIONS: AssignmentStatus[] = ['pending', 'accepted', 'in_progress', 'completed', 'rejected']

const STATUS_RANK: Record<AssignmentStatus, number> = {
  pending: 0,
  accepted: 1,
  in_progress: 2,
  completed: 3,
  rejected: 4
}

const TYPE_META: Record<
  AssignmentType,
  {
    Icon: LucideIcon
    iconClassName: string
    barClassName: string
  }
> = {
  pickup: {
    Icon: Truck,
    iconClassName: 'border-blue-100 bg-blue-50 text-blue-700',
    barClassName: 'bg-blue-500'
  },
  delivery: {
    Icon: Truck,
    iconClassName: 'border-amber-100 bg-amber-50 text-amber-700',
    barClassName: 'bg-amber-500'
  },
  wash: {
    Icon: Droplets,
    iconClassName: 'border-cyan-100 bg-cyan-50 text-cyan-700',
    barClassName: 'bg-cyan-500'
  },
  iron: {
    Icon: Sparkles,
    iconClassName: 'border-orange-100 bg-orange-50 text-orange-700',
    barClassName: 'bg-orange-500'
  },
  dry_clean: {
    Icon: Shirt,
    iconClassName: 'border-purple-100 bg-purple-50 text-purple-700',
    barClassName: 'bg-purple-500'
  }
}

type ViewMode = 'cards' | 'table'
type SortMode = 'newest' | 'oldest' | 'status' | 'cod_high'

const dateTimeFormatter = new Intl.DateTimeFormat('en-BD', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Dhaka'
})

const timeFormatter = new Intl.DateTimeFormat('en-BD', {
  timeStyle: 'short',
  timeZone: 'Asia/Dhaka'
})

function timestamp(value?: string | null) {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function isOpenAssignment(assignment: Assignment) {
  return assignment.status !== 'completed' && assignment.status !== 'rejected'
}

function assigneeName(assignment: Assignment) {
  return assignment.assignedTo?.fullName ?? 'Unassigned'
}

function formatSchedule(assignment: Assignment) {
  if (assignment.preferredTime) return assignment.preferredTime
  const assignedAt = timestamp(assignment.assignedAt)
  return assignedAt ? dateTimeFormatter.format(new Date(assignedAt)) : 'No schedule set'
}

function formatActivity(assignment: Assignment) {
  if (assignment.completedAt) return `Completed ${dateTimeFormatter.format(new Date(assignment.completedAt))}`
  if (assignment.acceptedAt) return `Accepted ${dateTimeFormatter.format(new Date(assignment.acceptedAt))}`
  if (assignment.assignedAt) return `Assigned ${dateTimeFormatter.format(new Date(assignment.assignedAt))}`
  return 'No activity yet'
}

function formatAge(value?: string | null) {
  const startedAt = timestamp(value)
  if (!startedAt) return 'No timestamp'
  const minutes = Math.max(1, Math.floor((Date.now() - startedAt) / 60000))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function exportAssignmentsCsv(rows: Assignment[]) {
  downloadCsv(
    `ironman-assignments-${new Date().toISOString().slice(0, 10)}.csv`,
    ['orderNumber', 'assignmentType', 'status', 'customer', 'assignedTo', 'schedule', 'amountDue', 'address'],
    rows.map((assignment) => [
      assignment.orderNumber,
      assignment.assignmentType,
      assignment.status,
      assignmentCustomerName(assignment),
      assigneeName(assignment),
      formatSchedule(assignment),
      assignment.amountDue ?? '',
      assignment.address ?? ''
    ])
  )
}

export function AdminAssignments() {
  const token = useAuthStore((state) => state.accessToken)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<AssignmentType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<AssignmentStatus | 'all'>('all')
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const requestIdRef = useRef(0)

  const loadAssignments = useCallback(
    async (background = false) => {
      if (!token) return
      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId
      if (background) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)
      try {
        const rows = await apiFetch<Assignment[]>('/admin/assignments', { token })
        if (requestId !== requestIdRef.current) return
        setAssignments(rows)
        setLastUpdated(new Date())
      } catch (err) {
        if (requestId !== requestIdRef.current) return
        setError(err instanceof Error ? err.message : 'Could not load assignments')
      } finally {
        if (requestId !== requestIdRef.current) return
        if (background) {
          setRefreshing(false)
        } else {
          setLoading(false)
        }
      }
    },
    [token]
  )

  useEffect(() => {
    void loadAssignments()
  }, [loadAssignments])

  useEffect(() => {
    return () => {
      requestIdRef.current += 1
    }
  }, [])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  const assignees = useMemo(() => {
    const rows = new Map<string, string>()
    for (const assignment of assignments) {
      if (assignment.assignedTo?.id) rows.set(assignment.assignedTo.id, assignment.assignedTo.fullName)
    }
    return Array.from(rows, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [assignments])

  const hasUnassigned = useMemo(
    () => assignments.some((assignment) => !assignment.assignedTo?.id),
    [assignments]
  )

  const filteredAssignments = useMemo(() => {
    const query = search.trim().toLowerCase()
    return [...assignments]
      .filter((assignment) => {
        if (typeFilter !== 'all' && assignment.assignmentType !== typeFilter) return false
        if (statusFilter !== 'all' && assignment.status !== statusFilter) return false
        if (assigneeFilter === '__unassigned' && assignment.assignedTo?.id) return false
        if (assigneeFilter !== 'all' && assigneeFilter !== '__unassigned' && assignment.assignedTo?.id !== assigneeFilter) {
          return false
        }
        if (!query) return true
        const haystack = [
          assignment.orderNumber,
          assignment.assignmentType,
          assignment.status,
          assignmentCustomerName(assignment),
          assignment.assignedTo?.fullName,
          assignment.assignedTo?.phone,
          assignment.address,
          assignment.notes
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(query)
      })
      .sort((a, b) => {
        if (sortMode === 'oldest') {
          const aTime = timestamp(a.assignedAt) || Number.MAX_SAFE_INTEGER
          const bTime = timestamp(b.assignedAt) || Number.MAX_SAFE_INTEGER
          return aTime - bTime
        }
        if (sortMode === 'status') {
          return STATUS_RANK[a.status] - STATUS_RANK[b.status] || timestamp(b.assignedAt) - timestamp(a.assignedAt)
        }
        if (sortMode === 'cod_high') {
          return Number(b.amountDue ?? 0) - Number(a.amountDue ?? 0) || timestamp(b.assignedAt) - timestamp(a.assignedAt)
        }
        return timestamp(b.assignedAt) - timestamp(a.assignedAt)
      })
  }, [assignments, assigneeFilter, search, sortMode, statusFilter, typeFilter])

  const openAssignments = useMemo(() => assignments.filter(isOpenAssignment), [assignments])
  const pendingCount = openAssignments.filter((assignment) => assignment.status === 'pending').length
  const movingCount = openAssignments.filter((assignment) => assignment.status === 'accepted' || assignment.status === 'in_progress').length
  const routeCount = openAssignments.filter(
    (assignment) => assignment.assignmentType === 'pickup' || assignment.assignmentType === 'delivery'
  ).length
  const stationCount = openAssignments.length - routeCount
  const codDue = openAssignments.reduce((sum, assignment) => sum + Number(assignment.amountDue ?? 0), 0)
  const hasFilters = Boolean(search || typeFilter !== 'all' || statusFilter !== 'all' || assigneeFilter !== 'all')

  function resetFilters() {
    setSearch('')
    setTypeFilter('all')
    setStatusFilter('all')
    setAssigneeFilter('all')
    setSortMode('newest')
  }

  return (
    <RequireAuth roles={['admin']}>
      {loading && assignments.length === 0 ? (
        <AssignmentBoardSkeleton />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AssignmentMetric
              label="Open work"
              value={String(openAssignments.length)}
              helper={`${pendingCount} pending, ${movingCount} moving`}
              icon={Truck}
              tone="navy"
            />
            <AssignmentMetric
              label="Route tasks"
              value={String(routeCount)}
              helper="Pickup and delivery"
              icon={MapPin}
              tone="blue"
            />
            <AssignmentMetric
              label="Station tasks"
              value={String(stationCount)}
              helper="Wash, iron, dry clean"
              icon={SlidersHorizontal}
              tone="amber"
            />
            <AssignmentMetric
              label="COD at risk"
              value={formatBdt(codDue)}
              helper="Open assignment balance"
              icon={WalletCards}
              tone="red"
            />
          </div>

          {error ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ironman-red/30 bg-ironman-red-50 px-4 py-3 text-sm text-ironman-red">
              <p className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" aria-hidden />
                {error}
              </p>
              <button
                type="button"
                onClick={() => void loadAssignments(true)}
                className="focus-ring rounded-lg bg-white px-3 py-2 text-xs font-bold text-ironman-red"
              >
                Retry
              </button>
            </div>
          ) : null}

          <section className="rounded-lg border border-ironman-navy-100 bg-white p-4 shadow-soft">
            <div className="grid gap-3 lg:grid-cols-12">
              <label className="relative lg:col-span-4">
                <span className="sr-only">Search assignments</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
                <input
                  className="tap-target w-full rounded-lg border border-ironman-navy-100 bg-white py-2 pl-9 pr-3 text-sm focus-ring"
                  placeholder="Search order, customer, staff, address"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>

              <select
                className="tap-target rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 text-sm focus-ring lg:col-span-2"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as AssignmentType | 'all')}
                aria-label="Filter by type"
              >
                <option value="all">All types</option>
                {TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {statusLabel(type)}
                  </option>
                ))}
              </select>

              <select
                className="tap-target rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 text-sm focus-ring lg:col-span-2"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as AssignmentStatus | 'all')}
                aria-label="Filter by status"
              >
                <option value="all">All statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>

              <select
                className="tap-target rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 text-sm focus-ring lg:col-span-2"
                value={assigneeFilter}
                onChange={(event) => setAssigneeFilter(event.target.value)}
                aria-label="Filter by assignee"
              >
                <option value="all">All staff</option>
                {hasUnassigned ? <option value="__unassigned">Unassigned</option> : null}
                {assignees.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.name}
                  </option>
                ))}
              </select>

              <select
                className="tap-target rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 text-sm focus-ring lg:col-span-2"
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                aria-label="Sort assignments"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="status">Workflow order</option>
                <option value="cod_high">Highest COD</option>
              </select>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ironman-navy-100 pt-4 text-xs text-gray-600">
              <p>
                Showing <span className="font-bold text-ironman-navy">{filteredAssignments.length}</span> of{' '}
                <span className="font-bold text-ironman-navy">{assignments.length}</span> assignments
                {lastUpdated ? `, updated ${timeFormatter.format(lastUpdated)}` : ''}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={resetFilters}
                  disabled={!hasFilters && sortMode === 'newest'}
                  className="tap-target focus-ring inline-flex items-center gap-2 rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 font-semibold text-ironman-navy disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" aria-hidden />
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => exportAssignmentsCsv(filteredAssignments)}
                  disabled={filteredAssignments.length === 0}
                  className="tap-target focus-ring inline-flex items-center gap-2 rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 font-semibold text-ironman-navy disabled:opacity-50"
                >
                  <Download className="h-4 w-4" aria-hidden />
                  Export
                </button>
                <button
                  type="button"
                  onClick={() => void loadAssignments(true)}
                  disabled={refreshing}
                  className="tap-target focus-ring inline-flex items-center gap-2 rounded-lg bg-ironman-navy px-3 py-2 font-semibold text-white disabled:opacity-70"
                >
                  <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} aria-hidden />
                  Refresh
                </button>
                <div className="inline-flex rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 p-1" role="group" aria-label="Assignment view">
                  <button
                    type="button"
                    aria-pressed={viewMode === 'cards'}
                    onClick={() => setViewMode('cards')}
                    className={cn(
                      'focus-ring inline-flex h-9 w-9 items-center justify-center rounded-md text-ironman-navy',
                      viewMode === 'cards' && 'bg-white shadow-sm'
                    )}
                    title="Card view"
                  >
                    <Grid2X2 className="h-4 w-4" aria-hidden />
                    <span className="sr-only">Card view</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={viewMode === 'table'}
                    onClick={() => setViewMode('table')}
                    className={cn(
                      'focus-ring inline-flex h-9 w-9 items-center justify-center rounded-md text-ironman-navy',
                      viewMode === 'table' && 'bg-white shadow-sm'
                    )}
                    title="Table view"
                  >
                    <List className="h-4 w-4" aria-hidden />
                    <span className="sr-only">Table view</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="min-w-0" aria-labelledby="assignment-board-heading">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 id="assignment-board-heading" className="text-xl font-bold text-ironman-navy">
                    Dispatch queue
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Prioritize older work, balance staff load, and open the linked order for reassignment or follow-up.
                  </p>
                </div>
                <span className="rounded-full bg-ironman-navy px-3 py-1 text-xs font-semibold text-white">
                  {filteredAssignments.filter(isOpenAssignment).length} open in view
                </span>
              </div>

              {filteredAssignments.length === 0 ? (
                <EmptyAssignments hasFilters={hasFilters} onReset={resetFilters} />
              ) : viewMode === 'table' ? (
                <AssignmentsTable assignments={filteredAssignments} />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  {filteredAssignments.map((assignment) => (
                    <AdminAssignmentCard key={assignment.id} assignment={assignment} />
                  ))}
                </div>
              )}
            </section>

            <aside className="space-y-5">
              <WorkloadPanel assignments={openAssignments} />
              <DispatchFocusPanel assignments={openAssignments} />
              <AdminLiveLocations />
            </aside>
          </div>
        </div>
      )}
    </RequireAuth>
  )
}

function AssignmentBoardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
      <TableSkeleton rows={6} />
    </div>
  )
}

type AssignmentMetricProps = {
  label: string
  value: string
  helper: string
  icon: LucideIcon
  tone: 'navy' | 'red' | 'blue' | 'amber'
}

const metricToneClassNames: Record<AssignmentMetricProps['tone'], string> = {
  navy: 'bg-ironman-navy text-white',
  red: 'bg-ironman-red text-white',
  blue: 'bg-blue-600 text-white',
  amber: 'bg-amber-500 text-ironman-navy'
}

function AssignmentMetric({ label, value, helper, icon: Icon, tone }: AssignmentMetricProps) {
  return (
    <div className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-2 break-words text-2xl font-bold text-ironman-navy">{value}</p>
          <p className="mt-1 text-sm text-gray-600">{helper}</p>
        </div>
        <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', metricToneClassNames[tone])}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
    </div>
  )
}

function AdminAssignmentCard({ assignment }: { assignment: Assignment }) {
  const meta = TYPE_META[assignment.assignmentType]
  const Icon = meta.Icon
  const open = isOpenAssignment(assignment)

  return (
    <article
      className={cn(
        'rounded-lg border bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-luxury',
        open ? 'border-ironman-navy-100' : 'border-gray-200 opacity-85'
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border', meta.iconClassName)}>
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-ironman-red">
              {statusLabel(assignment.assignmentType)}
            </p>
            <Link
              href={`/admin/orders/${assignment.orderId}`}
              className="mt-1 block truncate text-lg font-bold text-ironman-navy hover:text-ironman-red"
            >
              {assignment.orderNumber}
            </Link>
          </div>
        </div>
        <StatusBadge status={assignment.status} />
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg bg-ironman-navy-50 px-3 py-2">
          <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <UserRound className="h-3.5 w-3.5" aria-hidden />
            Customer
          </dt>
          <dd className="mt-1 truncate font-semibold text-ironman-navy">{assignmentCustomerName(assignment)}</dd>
        </div>
        <div className="rounded-lg bg-ironman-navy-50 px-3 py-2">
          <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <Truck className="h-3.5 w-3.5" aria-hidden />
            Staff
          </dt>
          <dd className="mt-1 truncate font-semibold text-ironman-navy">{assigneeName(assignment)}</dd>
        </div>
        <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-ironman-navy-100">
          <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden />
            Schedule
          </dt>
          <dd className="mt-1 font-semibold text-ironman-navy">{formatSchedule(assignment)}</dd>
        </div>
        <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-ironman-navy-100">
          <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <Clock3 className="h-3.5 w-3.5" aria-hidden />
            Age
          </dt>
          <dd className="mt-1 font-semibold text-ironman-navy">{formatAge(assignment.assignedAt)}</dd>
        </div>
      </dl>

      <p className="mt-4 flex gap-2 text-sm text-gray-600">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ironman-red" aria-hidden />
        <span className="line-clamp-2">{assignment.address ?? 'Warehouse handoff'}</span>
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ironman-navy-100 pt-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Last activity</p>
          <p className="mt-1 text-sm font-semibold text-ironman-navy">{formatActivity(assignment)}</p>
        </div>
        {assignment.amountDue && assignment.amountDue > 0 ? (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            {formatBdt(Number(assignment.amountDue))}
          </span>
        ) : null}
      </div>

      {assignment.notes ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">{assignment.notes}</p>
      ) : null}
    </article>
  )
}

function AssignmentsTable({ assignments }: { assignments: Assignment[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-ironman-navy-100 bg-white shadow-soft">
      <table className="min-w-[980px] w-full text-sm">
        <thead className="bg-ironman-navy text-white">
          <tr>
            <th className="px-4 py-4 text-left">Order</th>
            <th className="px-4 py-4 text-left">Type</th>
            <th className="px-4 py-4 text-left">Staff</th>
            <th className="px-4 py-4 text-left">Customer</th>
            <th className="px-4 py-4 text-left">Schedule</th>
            <th className="px-4 py-4 text-left">COD</th>
            <th className="px-4 py-4 text-left">Status</th>
            <th className="px-4 py-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((assignment, index) => (
            <tr key={assignment.id} className={index % 2 === 0 ? 'bg-white' : 'bg-ironman-navy-50'}>
              <td className="px-4 py-4">
                <Link href={`/admin/orders/${assignment.orderId}`} className="font-bold text-ironman-navy hover:text-ironman-red">
                  {assignment.orderNumber}
                </Link>
                <p className="mt-1 max-w-[260px] truncate text-xs text-gray-500">{assignment.address ?? 'Warehouse handoff'}</p>
              </td>
              <td className="px-4 py-4 font-semibold text-ironman-navy">{statusLabel(assignment.assignmentType)}</td>
              <td className="px-4 py-4">{assigneeName(assignment)}</td>
              <td className="px-4 py-4">{assignmentCustomerName(assignment)}</td>
              <td className="px-4 py-4">
                <span className="font-semibold text-ironman-navy">{formatSchedule(assignment)}</span>
                <span className="mt-1 block text-xs text-gray-500">{formatAge(assignment.assignedAt)}</span>
              </td>
              <td className="px-4 py-4 font-semibold text-ironman-navy">
                {assignment.amountDue && assignment.amountDue > 0 ? formatBdt(Number(assignment.amountDue)) : 'None'}
              </td>
              <td className="px-4 py-4">
                <StatusBadge status={assignment.status} />
              </td>
              <td className="px-4 py-4 text-right">
                <Link href={`/admin/orders/${assignment.orderId}`} className="font-semibold text-ironman-red">
                  View order
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function WorkloadPanel({ assignments }: { assignments: Assignment[] }) {
  const maxCount = Math.max(
    1,
    ...TYPE_OPTIONS.map((type) => assignments.filter((assignment) => assignment.assignmentType === type).length)
  )

  return (
    <section className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
      <h2 className="flex items-center gap-2 text-lg font-bold text-ironman-navy">
        <SlidersHorizontal className="h-5 w-5 text-ironman-red" aria-hidden />
        Workload mix
      </h2>
      <div className="mt-5 space-y-4">
        {TYPE_OPTIONS.map((type) => {
          const count = assignments.filter((assignment) => assignment.assignmentType === type).length
          const meta = TYPE_META[type]
          return (
            <div key={type}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-ironman-navy">{statusLabel(type)}</span>
                <span className="text-gray-500">{count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-ironman-navy-50">
                <div
                  className={cn('h-full rounded-full', meta.barClassName)}
                  style={{ width: count === 0 ? '0%' : `${Math.max(5, (count / maxCount) * 100)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function DispatchFocusPanel({ assignments }: { assignments: Assignment[] }) {
  const focus = [...assignments]
    .sort((a, b) => {
      const aTime = timestamp(a.assignedAt) || Number.MAX_SAFE_INTEGER
      const bTime = timestamp(b.assignedAt) || Number.MAX_SAFE_INTEGER
      return aTime - bTime
    })
    .slice(0, 4)

  return (
    <section className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
      <h2 className="flex items-center gap-2 text-lg font-bold text-ironman-navy">
        <CheckCircle2 className="h-5 w-5 text-ironman-red" aria-hidden />
        Dispatch focus
      </h2>
      {focus.length === 0 ? (
        <p className="mt-4 rounded-lg bg-ironman-navy-50 px-3 py-2 text-sm font-semibold text-ironman-navy">
          No open assignments need attention.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {focus.map((assignment) => (
            <Link
              key={assignment.id}
              href={`/admin/orders/${assignment.orderId}`}
              className="block rounded-lg border border-ironman-navy-100 bg-white p-3 hover:bg-ironman-navy-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-ironman-navy">{assignment.orderNumber}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {statusLabel(assignment.assignmentType)} for {assigneeName(assignment)}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-ironman-red-50 px-2 py-1 text-xs font-bold text-ironman-red">
                  {formatAge(assignment.assignedAt)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

function EmptyAssignments({ hasFilters, onReset }: { hasFilters: boolean; onReset: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-ironman-navy-100 bg-white p-8 text-center shadow-soft">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-ironman-navy-50 text-ironman-navy">
        <Truck className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="mt-4 text-lg font-bold text-ironman-navy">
        {hasFilters ? 'No assignments match these filters' : 'No active assignments right now'}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
        {hasFilters
          ? 'Clear the filters or refresh the board to bring current work back into view.'
          : 'New work appears here as orders are assigned to delivery or station staff.'}
      </p>
      {hasFilters ? (
        <button
          type="button"
          onClick={onReset}
          className="tap-target focus-ring mt-5 rounded-lg bg-ironman-navy px-4 py-2 text-sm font-semibold text-white"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  )
}
