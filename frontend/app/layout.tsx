
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { AppProviders } from '@/components/app-providers'
import './globals.css'
import 'leaflet/dist/leaflet.css'

export const metadata: Metadata = {
  title: 'IRONMAN Laundry',
  description: 'Online laundry, dry cleaning, ironing, delivery tracking, and fully logged COD payments for Dhaka customers.',
  keywords: 'laundry, dry cleaning, ironing, Dhaka, Bangladesh, doorstep delivery, IRONMAN',
  openGraph: {
    title: 'IRONMAN Laundry',
    description: 'Premium online laundry and dry cleaning service in Dhaka.',
    type: 'website'
  }
}

const supportedLocales = ['en', 'bn'] as const
type SupportedLocale = (typeof supportedLocales)[number]

async function getMessages(locale: SupportedLocale) {
  return (await import(`../messages/${locale}.json`)).default
}

async function getLocale(): Promise<SupportedLocale> {
  const value = (await cookies()).get('IRONMAN_LOCALE')?.value
  return supportedLocales.includes(value as SupportedLocale) ? (value as SupportedLocale) : 'en'
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages(locale)

  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#D81B2A" />
      </head>
      <body className="font-body antialiased">
        <AppProviders locale={locale} messages={messages}>
          {children}
        </AppProviders>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
