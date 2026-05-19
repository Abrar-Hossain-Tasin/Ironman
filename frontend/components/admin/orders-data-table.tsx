'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Truck } from 'lucide-react'
import { OrderStatusBadge } from '@/components/admin/order-status-badge'
import { Badge } from '@/components/ui/badge'
import { cn, formatBdt } from '@/lib/utils'
import type { OrderResponse } from '@/types'

type Props = {
  data: OrderResponse[]
  globalFilter: string
  /** Open the "Assign driver" sheet for this order. */
  onAssign?: (order: OrderResponse) => void
}

function paymentTone(status: OrderResponse['paymentStatus']) {
  if (status === 'paid') return 'emerald' as const
  if (status === 'partial') return 'amber' as const
  return 'slate' as const
}

export function OrdersDataTable({ data, globalFilter, onAssign }: Props) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])

  const columns = useMemo<ColumnDef<OrderResponse>[]>(
    () => [
      {
        id: 'orderNumber',
        accessorKey: 'orderNumber',
        header: 'Order',
        cell: ({ row }) => (
          <Link
            href={`/admin/orders/${row.original.id}`}
            className="font-bold text-ironman-navy hover:underline"
          >
            {row.original.orderNumber}
          </Link>
        )
      },
      {
        id: 'customer',
        header: 'Customer',
        accessorFn: (row) => row.customer.fullName,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-ironman-navy">{row.original.customer.fullName}</p>
            <p className="truncate text-[11px] text-gray-500">{row.original.customer.phone}</p>
          </div>
        )
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
        filterFn: 'equalsString'
      },
      {
        id: 'payment',
        header: 'Payment',
        accessorFn: (row) => `${row.paymentMethod}-${row.paymentStatus}`,
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <Badge tone={paymentTone(row.original.paymentStatus)}>{row.original.paymentStatus}</Badge>
            <span className="text-[11px] uppercase tracking-wide text-gray-500">
              {row.original.paymentMethod}
            </span>
          </div>
        )
      },
      {
        id: 'totalAmount',
        accessorKey: 'totalAmount',
        header: () => <div className="text-right">Total</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums font-semibold text-ironman-navy">
            {formatBdt(row.original.totalAmount)}
          </div>
        ),
        sortingFn: 'basic'
      },
      {
        id: 'paidAmount',
        accessorKey: 'paidAmount',
        header: () => <div className="text-right">Paid</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums text-emerald-700">
            {formatBdt(row.original.paidAmount)}
          </div>
        ),
        sortingFn: 'basic'
      },
      {
        id: 'createdAt',
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ row }) => (
          <span className="text-[11px] text-gray-500">
            {new Date(row.original.createdAt).toLocaleString(undefined, {
              dateStyle: 'short',
              timeStyle: 'short'
            })}
          </span>
        ),
        sortingFn: 'datetime'
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            {onAssign ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onAssign(row.original)
                }}
                title="Assign driver"
                className="focus-ring inline-flex h-7 items-center gap-1 rounded-md border border-ironman-navy-100 bg-white px-2 text-[11px] font-semibold text-ironman-navy hover:bg-ironman-navy-50"
              >
                <Truck className="h-3 w-3" aria-hidden />
                Assign
              </button>
            ) : null}
          </div>
        )
      }
    ],
    [onAssign]
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
    globalFilterFn: (row, _columnId, value) => {
      if (!value) return true
      const q = String(value).toLowerCase()
      const order = row.original
      return (
        order.orderNumber.toLowerCase().includes(q) ||
        order.customer.fullName.toLowerCase().includes(q) ||
        order.customer.phone.toLowerCase().includes(q) ||
        order.customer.email.toLowerCase().includes(q)
      )
    }
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageCount = table.getPageCount()

  return (
    <div className="overflow-hidden rounded-xl border border-ironman-navy-100 bg-white shadow-soft">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead className="bg-ironman-navy-50/60">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sortDir = header.column.getIsSorted()
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className={cn(
                        'border-b border-ironman-navy-100 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-ironman-navy/70',
                        canSort && 'cursor-pointer select-none hover:text-ironman-navy'
                      )}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <span className="inline-flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort ? (
                          sortDir === 'asc' ? (
                            <ArrowUp className="h-3 w-3" aria-hidden />
                          ) : sortDir === 'desc' ? (
                            <ArrowDown className="h-3 w-3" aria-hidden />
                          ) : (
                            <ChevronsUpDown className="h-3 w-3 opacity-40" aria-hidden />
                          )
                        ) : null}
                      </span>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-ironman-navy-100">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-10 text-center text-sm text-gray-500">
                  No orders match the current filters.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="transition hover:bg-ironman-navy-50/40">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="whitespace-nowrap px-3 py-2 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <nav
        aria-label="Pagination"
        className="flex flex-wrap items-center justify-between gap-3 border-t border-ironman-navy-100 px-4 py-2 text-[11px] text-gray-500"
      >
        <span>
          Page {pageCount === 0 ? 0 : pageIndex + 1} of {pageCount} ·{' '}
          {table.getFilteredRowModel().rows.length} row(s)
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            className="focus-ring inline-flex items-center gap-1 rounded-md border border-ironman-navy-100 bg-white px-2 py-1 font-semibold text-ironman-navy disabled:opacity-50"
          >
            <ChevronLeft className="h-3 w-3" aria-hidden />
            Prev
          </button>
          <button
            type="button"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            className="focus-ring inline-flex items-center gap-1 rounded-md border border-ironman-navy-100 bg-white px-2 py-1 font-semibold text-ironman-navy disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-3 w-3" aria-hidden />
          </button>
        </div>
      </nav>
    </div>
  )
}
