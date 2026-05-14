import type { ReactNode } from 'react'
import Link from 'next/link'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'

type LegalShellProps = {
  title: string
  effectiveDate: string
  intro?: string
  children: ReactNode
}

const legalLinks = [
  { href: '/legal/terms', label: 'Terms of Service' },
  { href: '/legal/privacy', label: 'Privacy Policy' },
  { href: '/legal/refund-policy', label: 'Refund Policy' }
]

export function LegalShell({ title, effectiveDate, intro, children }: LegalShellProps) {
  return (
    <>
      <SiteHeader variant="dark" />
      <main className="min-h-screen bg-ironman-navy-50">
        <section className="container-page pt-32 pb-16 sm:pt-40">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-ironman-red">Legal</p>
          <h1 className="mt-3 text-3xl font-bold text-ironman-navy sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-gray-500">Effective {effectiveDate}</p>
          {intro ? <p className="mt-4 max-w-3xl text-gray-700">{intro}</p> : null}

          <nav className="mt-6 flex flex-wrap gap-2" aria-label="Legal pages">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-ironman-navy-100 bg-white px-3 py-1.5 text-xs font-semibold text-ironman-navy hover:bg-ironman-navy hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <article className="prose-legal mt-10 max-w-3xl space-y-6 rounded-lg border border-ironman-navy-100 bg-white p-6 shadow-soft sm:p-8">
            {children}
          </article>

          <p className="mt-8 max-w-3xl text-xs text-gray-500">
            This document is provided as a general template and is not a substitute for legal advice. For questions, write to{' '}
            <a href="mailto:legal@ironman.local" className="font-semibold text-ironman-red underline">
              legal@ironman.local
            </a>
            .
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-ironman-navy">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-7 text-gray-700">{children}</div>
    </section>
  )
}
