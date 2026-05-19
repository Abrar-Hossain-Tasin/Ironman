'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { Command } from 'cmdk'
import { useRouter, usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  ListChecks,
  PackageSearch,
  Search,
  Truck,
  UserRound,
  WalletCards
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { cn } from '@/lib/utils'
import type { CustomerListResponse, OrderResponse, UserRole } from '@/types'

// Routes that get auto-suggested. Only shown when current user is an admin.
const QUICK_ROUTES = [
  { href: '/admin/dashboard', label: 'Go to Dashboard', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Go to Orders', icon: ListChecks },
  { href: '/admin/assignments', label: 'Go to Assignments', icon: Truck },
  { href: '/admin/customers', label: 'Go to Customers', icon: UserRound },
  { href: '/admin/payments', label: 'Go to Payments', icon: WalletCards },
  { href: '/admin/pricing', label: 'Go to Pricing', icon: WalletCards }
]

export function AdminCommandPalette() {
  const router = useRouter()
  const pathname = usePathname()
  const role: UserRole | undefined = useAuthStore((s) => s.user?.role)
  const token = useAuthStore((s) => s.accessToken)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  // Global hotkey: Cmd/Ctrl + K. Skipped when palette already mounted in a
  // form to avoid stealing typing.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((v) => !v)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Reset query when closed; auto-close on route change.
  useEffect(() => {
    if (!open) setQuery('')
  }, [open])
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const isAdmin = role === 'admin'

  // Pull a slim window of orders & customers for search. We fire these only
  // when the palette is open AND user is admin AND there's a query, to avoid
  // blowing through the API on idle.
  const ordersQuery = useQuery<OrderResponse[]>({
    queryKey: ['admin', 'command', 'orders', query],
    enabled: open && isAdmin && Boolean(token) && query.length >= 2,
    staleTime: 10_000,
    queryFn: () => apiFetch<OrderResponse[]>('/admin/orders')
  })

  const customersQuery = useQuery<CustomerListResponse>({
    queryKey: ['admin', 'command', 'customers', query],
    enabled: open && isAdmin && Boolean(token) && query.length >= 2,
    staleTime: 10_000,
    queryFn: () => apiFetch<CustomerListResponse>(`/admin/customers?page=0&size=10&q=${encodeURIComponent(query)}`)
  })

  function go(href: string) {
    setOpen(false)
    router.push(href)
  }

  if (!isAdmin) return null

  const q = query.trim().toLowerCase()
  const matchingOrders = (ordersQuery.data ?? [])
    .filter((order) =>
      !q ||
      order.orderNumber.toLowerCase().includes(q) ||
      order.customer.fullName.toLowerCase().includes(q) ||
      order.customer.phone.toLowerCase().includes(q)
    )
    .slice(0, 6)

  const matchingCustomers = (customersQuery.data?.content ?? []).slice(0, 6)

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-ironman-navy-dark/40 backdrop-blur-sm transition-opacity duration-150 data-[state=closed]:opacity-0 data-[state=open]:opacity-100" />
        <Dialog.Content
          aria-label="Admin command palette"
          className="fixed left-1/2 top-[16%] z-[81] w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-xl border border-ironman-navy-100 bg-white shadow-2xl"
        >
          <Dialog.Title className="sr-only">Admin command palette</Dialog.Title>
          <Command label="Admin command palette" shouldFilter={false}>
            <div className="flex items-center gap-2 border-b border-ironman-navy-100 px-3">
              <Search className="h-4 w-4 text-gray-400" aria-hidden />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Search orders, customers, or jump to a section…"
                className="h-12 w-full bg-transparent text-sm text-ironman-navy outline-none placeholder:text-gray-400"
              />
              <kbd className="hidden rounded border border-ironman-navy-100 bg-ironman-navy-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-ironman-navy/70 sm:inline">
                Esc
              </kbd>
            </div>
            <Command.List className="max-h-[60vh] overflow-y-auto p-2">
              <Command.Empty className="px-3 py-6 text-center text-sm text-gray-500">
                {query.length < 2 ? 'Type at least 2 characters to search.' : 'No results.'}
              </Command.Empty>

              <Command.Group
                heading="Quick navigation"
                className="px-1 text-[11px] font-bold uppercase tracking-wide text-ironman-navy/60"
              >
                {QUICK_ROUTES.map((item) => {
                  const Icon = item.icon
                  return (
                    <Command.Item
                      key={item.href}
                      value={item.label}
                      onSelect={() => go(item.href)}
                      className={cn(
                        'mt-1 flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-ironman-navy aria-selected:bg-ironman-navy-50'
                      )}
                    >
                      <Icon className="h-4 w-4 text-gray-400" aria-hidden />
                      {item.label}
                    </Command.Item>
                  )
                })}
              </Command.Group>

              {matchingOrders.length > 0 ? (
                <Command.Group
                  heading="Orders"
                  className="mt-3 px-1 text-[11px] font-bold uppercase tracking-wide text-ironman-navy/60"
                >
                  {matchingOrders.map((order) => (
                    <Command.Item
                      key={order.id}
                      value={`order-${order.orderNumber}-${order.customer.fullName}`}
                      onSelect={() => go(`/admin/orders/${order.id}`)}
                      className="mt-1 flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm aria-selected:bg-ironman-navy-50"
                    >
                      <PackageSearch className="h-4 w-4 text-gray-400" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ironman-navy">
                          {order.orderNumber}
                        </p>
                        <p className="truncate text-[11px] text-gray-500">
                          {order.customer.fullName} · {order.status.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
              ) : null}

              {matchingCustomers.length > 0 ? (
                <Command.Group
                  heading="Customers"
                  className="mt-3 px-1 text-[11px] font-bold uppercase tracking-wide text-ironman-navy/60"
                >
                  {matchingCustomers.map((customer) => (
                    <Command.Item
                      key={customer.id}
                      value={`customer-${customer.fullName}-${customer.email}`}
                      onSelect={() => go(`/admin/customers/${customer.id}`)}
                      className="mt-1 flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm aria-selected:bg-ironman-navy-50"
                    >
                      <UserRound className="h-4 w-4 text-gray-400" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ironman-navy">
                          {customer.fullName}
                        </p>
                        <p className="truncate text-[11px] text-gray-500">
                          {customer.email} · {customer.orderCount} orders
                        </p>
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
              ) : null}
            </Command.List>
            <div className="flex items-center justify-between border-t border-ironman-navy-100 px-3 py-2 text-[11px] text-gray-500">
              <span>
                Press <kbd className="rounded bg-ironman-navy-50 px-1 font-bold">↑↓</kbd> to navigate,{' '}
                <kbd className="rounded bg-ironman-navy-50 px-1 font-bold">↵</kbd> to open.
              </span>
              <span>
                <kbd className="rounded bg-ironman-navy-50 px-1 font-bold">⌘K</kbd> toggles this palette
              </span>
            </div>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
