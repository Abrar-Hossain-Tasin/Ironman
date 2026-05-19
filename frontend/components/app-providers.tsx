'use client'

import { NextIntlClientProvider } from 'next-intl'
import { Toaster } from 'sonner'
import type { ReactNode } from 'react'
import { CookieConsentBanner } from '@/components/cookie-consent-banner'
import { AdminCommandPalette } from '@/components/admin/admin-command-palette'
import { PwaRegister } from '@/components/pwa-register'
import { QueryProvider } from '@/components/providers/query-provider'
import { ConfirmProvider } from '@/components/ui/confirm-dialog'

type AppProvidersProps = {
  children: ReactNode
  locale: string
  messages: Record<string, unknown>
}

export function AppProviders({ children, locale, messages }: AppProvidersProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <QueryProvider>
        <ConfirmProvider>
          {children}
          <AdminCommandPalette />
          <CookieConsentBanner />
          <PwaRegister />
        </ConfirmProvider>
        <Toaster position="top-right" richColors closeButton />
      </QueryProvider>
    </NextIntlClientProvider>
  )
}
