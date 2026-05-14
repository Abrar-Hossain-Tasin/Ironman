
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Menu, X, UserRound, ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { LanguageToggle } from '@/components/language-toggle'
import { cn } from '@/lib/utils'

// ─── DEFINING NAV ITEMS ──────────────────────────────────────────────────
export function SiteHeader({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const t = useTranslations('common')
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const localizedNavItems = [
    { href: '/', label: t('home') },
    { href: '/pricing', label: t('pricing') },
    { href: '/track', label: t('trackOrder') }
  ]

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // isDarkText determines if the links should be Navy Blue
  // This happens if the user has scrolled OR if the page background is light (Pricing page)
  const isDarkText = scrolled || variant === 'dark'

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
          scrolled
            ? 'py-1 bg-white/90 backdrop-blur-xl border-b border-ironman-navy/10 shadow-soft'
            : 'py-6 bg-transparent'
        )}
      >
        <div className="container-page flex h-14 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="group flex items-center flex-shrink-0">
            <div className={cn('relative transition-all duration-300', scrolled ? 'h-10' : 'h-12')}>
              <Image
                src="/Ironman-logo.png"
                alt="IRONMAN Logo"
                width={140}
                height={48}
                className={cn(
                  'h-auto w-auto object-contain transition-all duration-500',
                  !isDarkText ? 'brightness-0 invert' : '' // Turn white only on dark backgrounds
                )}
                priority
              />
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden items-center gap-8 md:flex">
            {localizedNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative font-body font-medium text-sm tracking-wide transition-all duration-200 group',
                  isDarkText ? 'text-ironman-navy hover:text-ironman-red' : 'text-white/90 hover:text-white'
                )}
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-ironman-red transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </nav>

          {/* Desktop Buttons */}
          <div className="hidden items-center gap-3 md:flex">
            <div className={isDarkText ? 'text-ironman-navy' : 'text-white'}>
              <LanguageToggle compact />
            </div>
            <Link
              href="/login"
              className={cn(
                'tap-target focus-ring inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-body font-semibold transition-all duration-300',
                isDarkText
                  ? 'border border-ironman-navy/20 text-ironman-navy hover:bg-ironman-navy/5'
                  : 'btn-glass text-white border border-white/20'
              )}
            >
              <UserRound className="h-4 w-4" />
              {t('login')}
            </Link>
            <Link
              href="/register"
              className="tap-target focus-ring inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-body font-semibold text-white bg-ironman-red btn-shimmer"
            >
              {t('getStarted')}
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button
            className={cn(
              'tap-target focus-ring inline-flex items-center justify-center rounded-xl p-2 transition-colors md:hidden',
              isDarkText ? 'text-ironman-navy hover:bg-ironman-navy/5' : 'text-white hover:bg-white/10'
            )}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      <div
        className={cn(
          'fixed inset-0 z-[60] transition-all duration-500 md:hidden',
          menuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        <div className="absolute inset-0 bg-ironman-navy-dark/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
        <div
          className={cn(
            'absolute top-0 right-0 h-full w-80 max-w-[85vw] transition-transform duration-500 ease-luxury',
            menuOpen ? 'translate-x-0' : 'translate-x-full'
          )}
          style={{
            background: 'rgba(15, 21, 48, 0.97)',
            backdropFilter: 'blur(20px)',
            borderLeft: '1px solid rgba(255,255,255,0.08)'
          }}
        >
          <div className="flex flex-col h-full p-6 pt-20">
            <Image src="/Ironman-logo.png" alt="Logo" width={140} height={48} className="brightness-0 invert mb-8" />
            <nav className="flex flex-col gap-1">
              {localizedNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between rounded-xl px-4 py-3 font-body font-medium text-white/80 transition-all duration-200 hover:bg-white/8 hover:text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                  <ChevronDown className="h-4 w-4 -rotate-90 opacity-40" />
                </Link>
              ))}
            </nav>

            <div className="mt-auto flex flex-col gap-3">
              <Link
                href="/login"
                className="tap-target focus-ring flex items-center justify-center gap-2 rounded-xl border border-white/20 px-5 py-3 font-body font-semibold text-white"
                onClick={() => setMenuOpen(false)}
              >
                <UserRound className="h-4 w-4" />
                {t('login')}
              </Link>
              <Link
                href="/register"
                className="tap-target focus-ring inline-flex items-center justify-center rounded-xl px-5 py-3 font-body font-semibold text-white bg-ironman-red btn-shimmer"
                onClick={() => setMenuOpen(false)}
              >
                {t('getStarted')}
              </Link>
              <div className="text-white">
                <LanguageToggle />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
