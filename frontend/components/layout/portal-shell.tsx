'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { LogoutButton } from '@/components/auth/logout-button'
import { LanguageToggle } from '@/components/language-toggle'
import { Icon } from '@/components/ui/icon'
import { NotificationBell } from '@/components/ui/notification-bell'
import { cn } from '@/lib/utils'

type PortalShellProps = {
  title: string
  subtitle: string
  nav: Array<{ href: string; label: string; icon: string }>
  children: ReactNode
}

function isActive(href: string, pathname: string | null) {
  if (!pathname) return false
  if (pathname === href) return true
  // Treat child routes as active too (e.g. /admin/orders/[id] highlights /admin/orders).
  return pathname.startsWith(href + '/')
}

export function PortalShell({ title, subtitle, nav, children }: PortalShellProps) {
  const pathname = usePathname()
  return (
    <div className="min-h-screen bg-ironman-navy-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-ironman-navy text-white lg:block">
        <div className="flex h-16 items-center border-b border-white/10 px-6 text-xl font-bold">IRONMAN</div>
        <nav className="space-y-1 px-3 py-5">
          {nav.map((item) => {
            const active = isActive(item.href, pathname)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white',
                  active && 'bg-white/10 text-white'
                )}
              >
                <Icon name={item.icon} className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="border-b border-ironman-navy-100 bg-white">
          <div className="container-page flex min-h-16 flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ironman-red">{subtitle}</p>
              <h1 className="text-2xl font-bold text-ironman-navy">{title}</h1>
            </div>
            <div className="flex items-center gap-3">
              <LanguageToggle compact />
              <NotificationBell />
              <LogoutButton />
            </div>
          </div>
        </header>
        <main className="container-page py-6">{children}</main>
      </div>
    </div>
  )
}
