'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type Crumb = { label: string; href?: string }

// Built-in label map for path segments. Anything not in this map is
// title-cased and rendered as-is. UUIDs get a friendlier short label.
const LABELS: Record<string, string> = {
  admin: 'Admin',
  dashboard: 'Dashboard',
  orders: 'Orders',
  customers: 'Customers',
  assignments: 'Assignments',
  staff: 'Staff',
  coupons: 'Coupons',
  issues: 'Issues',
  refunds: 'Refunds',
  payments: 'Payments',
  pricing: 'Pricing',
  reports: 'Reports',
  broadcasts: 'Broadcasts',
  customer: 'Customer',
  delivery: 'Delivery',
  worker: 'Worker',
  profile: 'Profile',
  new: 'New',
  notifications: 'Notifications'
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function labelFor(segment: string): string {
  if (LABELS[segment]) return LABELS[segment]
  if (UUID_RE.test(segment)) return `#${segment.slice(0, 8)}`
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
}

function crumbsFromPath(pathname: string | null): Crumb[] {
  if (!pathname || pathname === '/') return []
  const segments = pathname.split('/').filter(Boolean)
  return segments.map((seg, idx) => {
    const href = '/' + segments.slice(0, idx + 1).join('/')
    return { label: labelFor(seg), href: idx === segments.length - 1 ? undefined : href }
  })
}

export function Breadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname()
  const crumbs = crumbsFromPath(pathname)
  if (crumbs.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center text-xs text-gray-500', className)}>
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((crumb, idx) => (
          <li key={`${crumb.label}-${idx}`} className="flex items-center gap-1">
            {idx > 0 ? <ChevronRight className="h-3 w-3 text-gray-300" aria-hidden /> : null}
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="rounded px-1 py-0.5 font-semibold text-ironman-navy/70 hover:bg-ironman-navy-50 hover:text-ironman-navy"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="px-1 py-0.5 font-semibold text-ironman-navy" aria-current="page">
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
