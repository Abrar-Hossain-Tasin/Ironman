'use client'

import { NextIntlClientProvider } from 'next-intl'
import { Toaster } from 'sonner'
import type { ReactNode } from 'react'
import { CookieConsentBanner } from '@/components/cookie-consent-banner'
import { PwaRegister } from '@/components/pwa-register'
import { ConfirmProvider } from '@/components/ui/confirm-dialog'

type AppProvidersProps = {
  children: ReactNode
  locale: string
  messages: Record<string, unknown>
}

export function AppProviders({ children, locale, messages }: AppProvidersProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ConfirmProvider>
        {children}
        <CookieConsentBanner />
        <PwaRegister />
      </ConfirmProvider>
      <Toaster position="top-right" richColors closeButton />
    </NextIntlClientProvider>
  )
}
