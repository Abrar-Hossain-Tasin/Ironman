'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const COOKIE_KEY = 'ironman-cookie-consent'

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(window.localStorage.getItem(COOKIE_KEY) !== 'accepted')
  }, [])

  function accept() {
    window.localStorage.setItem(COOKIE_KEY, 'accepted')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <section
      className="fixed bottom-4 left-1/2 z-[80] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 rounded-lg border border-ironman-navy-100 bg-white p-4 shadow-luxury"
      aria-label="Cookie consent"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-gray-700">
          We use essential cookies for login, language choice, and order security. Optional analytics stay off unless configured.
          Read the <Link href="/legal/privacy" className="font-semibold text-ironman-red hover:underline">Privacy Policy</Link>.
        </p>
        <button
          type="button"
          onClick={accept}
          className="tap-target focus-ring shrink-0 rounded-lg bg-ironman-navy px-4 py-2 text-sm font-semibold text-white"
        >
          Accept
        </button>
      </div>
    </section>
  )
}
