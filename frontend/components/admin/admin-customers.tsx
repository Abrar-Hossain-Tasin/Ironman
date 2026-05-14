'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AlertOctagon, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { toast } from 'sonner'
import { RequireAuth } from '@/components/auth/require-auth'
import { TableSkeleton } from '@/components/ui/skeleton'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { formatBdt } from '@/lib/utils'
import type { CustomerListResponse } from '@/types'

const PAGE_SIZE = 25

export function AdminCustomers() {
  const token = useAuthStore((state) => state.accessToken)
  const [data, setData] = useState<CustomerListResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)

  // Debounce text input — every keystroke hitting the API was the old pain.
  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(handle)
  }, [search])

  // Search changes → bounce back to page 0.
  useEffect(() => {
    setPage(0)
  }, [debouncedSearch])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) })
    if (debouncedSearch) params.set('q', debouncedSearch)
    apiFetch<CustomerListResponse>(`/admin/customers?${params.toString()}`, { token })
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load customers')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, debouncedSearch, page])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  const rows = data?.content ?? []
  const totalPages = data?.totalPages ?? 1
  const totalElements = data?.totalElements ?? 0

  return (
    <RequireAuth roles={['admin']}>
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <label className="relative md:col-span-2 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email, or phone"
            className="tap-target w-full rounded-lg border border-ironman-navy-100 bg-white pl-9 pr-3 py-2 focus-ring"
          />
        </label>
        <p className="self-center text-xs text-gray-500">
          {totalElements} customer{totalElements === 1 ? '' : 's'} total
        </p>
      </div>

      {loading && rows.length === 0 ? (
        <TableSkeleton rows={8} />
      ) : rows.length === 0 ? (
        <p className="rounded-lg bg-white p-5 text-sm text-gray-600 shadow-soft">
          {debouncedSearch ? 'No customers match that search.' : 'No customers yet.'}
        </p>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-ironman-navy-100 bg-white shadow-soft">
            <table className="w-full text-sm">
              <thead className="bg-ironman-navy-50 text-left text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Contact</th>
                  <th className="px-3 py-2 text-right">Orders</th>
                  <th className="px-3 py-2 text-right">Total spent</th>
                  <th className="px-3 py-2 text-right">Paid</th>
                  <th className="px-3 py-2 text-right">Issues</th>
                  <th className="px-3 py-2">Last order</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-ironman-navy-100">
                    <td className="px-3 py-2">
                      <Link href={`/admin/customers/${row.id}`} className="font-bold text-ironman-red hover:underline">
                        {row.fullName}
                      </Link>
                      {!row.active ? (
                        <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                          Inactive
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {row.email}
                      <br />
                      {row.phone}
                    </td>
                    <td className="px-3 py-2 text-right">{row.orderCount}</td>
                    <td className="px-3 py-2 text-right font-semibold">{formatBdt(Number(row.totalSpent))}</td>
                    <td className="px-3 py-2 text-right text-emerald-700">{formatBdt(Number(row.totalPaid))}</td>
                    <td className="px-3 py-2 text-right">
                      {row.openIssues > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-ironman-red-50 px-2 py-0.5 text-xs font-bold text-ironman-red">
                          <AlertOctagon className="h-3 w-3" aria-hidden />
                          {row.openIssues}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {row.lastOrderAt ? new Date(row.lastOrderAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm" aria-label="Pagination">
            <p className="text-gray-500">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 0 || loading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="focus-ring inline-flex items-center gap-1 rounded-lg border border-ironman-navy-100 bg-white px-3 py-1.5 font-semibold text-ironman-navy disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden /> Prev
              </button>
              <button
                type="button"
                disabled={page + 1 >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="focus-ring inline-flex items-center gap-1 rounded-lg border border-ironman-navy-100 bg-white px-3 py-1.5 font-semibold text-ironman-navy disabled:opacity-50"
              >
                Next <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </nav>
        </>
      )}
    </RequireAuth>
  )
}
