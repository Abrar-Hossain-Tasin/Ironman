'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
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

const COLLAPSED_STORAGE_KEY = 'ironman-sidebar-collapsed'

function isActive(href: string, pathname: string | null) {
  if (!pathname) return false
  if (pathname === href) return true
  // Treat child routes as active too (e.g. /admin/orders/[id] highlights /admin/orders).
  return pathname.startsWith(href + '/')
}

export function PortalShell({ title, subtitle, nav, children }: PortalShellProps) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  // Default to expanded on first render so SSR/CSR markup matches; we hydrate
  // the persisted preference on the client right after mount.
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === '1')
    } catch {
      // localStorage can be unavailable in strict privacy modes.
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSED_STORAGE_KEY, collapsed ? '1' : '0')
    } catch {
      // noop
    }
  }, [collapsed])

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  // Lock body scroll while the drawer is open so the page behind doesn't move.
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  function renderNavLinks(compact: boolean) {
    return nav.map((item) => {
      const active = isActive(item.href, pathname)
      return (
        <Link
          key={item.href}
          href={item.href}
          aria-current={active ? 'page' : undefined}
          title={compact ? item.label : undefined}
          className={cn(
            'flex items-center rounded-lg text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white',
            compact ? 'justify-center px-2 py-3' : 'gap-3 px-3 py-3',
            active && 'bg-white/10 text-white'
          )}
        >
          <Icon name={item.icon} className="h-4 w-4 shrink-0" aria-hidden />
          {compact ? <span className="sr-only">{item.label}</span> : <span>{item.label}</span>}
        </Link>
      )
    })
  }

  return (
    <div className="min-h-screen bg-ironman-navy-50">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 hidden bg-ironman-navy text-white transition-[width] duration-200 ease-out lg:block',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        <div
          className={cn(
            'flex h-16 items-center border-b border-white/10',
            collapsed ? 'justify-center px-2' : 'justify-between px-6'
          )}
        >
          {!collapsed ? <span className="text-xl font-bold">IRONMAN</span> : null}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="focus-ring rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-5 w-5" aria-hidden />
            ) : (
              <PanelLeftClose className="h-5 w-5" aria-hidden />
            )}
          </button>
        </div>
        <nav className={cn('space-y-1 py-5', collapsed ? 'px-2' : 'px-3')}>
          {renderNavLinks(collapsed)}
        </nav>
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed inset-0 z-[60] transition-opacity duration-300 lg:hidden',
          menuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        <div
          className="absolute inset-0 bg-ironman-navy-dark/60 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
          aria-hidden
        />
        <aside
          className={cn(
            'absolute inset-y-0 left-0 w-64 max-w-[85vw] bg-ironman-navy text-white shadow-2xl transition-transform duration-300',
            menuOpen ? 'translate-x-0' : '-translate-x-full'
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div className="flex h-16 items-center justify-between border-b border-white/10 px-6">
            <span className="text-xl font-bold">IRONMAN</span>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="focus-ring rounded-lg p-1 text-white/80 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <nav className="space-y-1 px-3 py-5">{renderNavLinks(false)}</nav>
        </aside>
      </div>

      <div
        className={cn(
          'transition-[padding] duration-200 ease-out',
          collapsed ? 'lg:pl-16' : 'lg:pl-64'
        )}
      >
        <header className="border-b border-ironman-navy-100 bg-white">
          <div className="container-page flex min-h-16 flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label="Open menu"
                className="focus-ring -ml-1 rounded-lg p-2 text-ironman-navy hover:bg-ironman-navy-50 lg:hidden"
              >
                <Menu className="h-6 w-6" aria-hidden />
              </button>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ironman-red">{subtitle}</p>
                <h1 className="text-2xl font-bold text-ironman-navy">{title}</h1>
              </div>
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
