'use client'

import { useRouter } from 'next/navigation'
import { Languages } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations('language')
  const nextLocale = locale === 'bn' ? 'en' : 'bn'

  function switchLanguage() {
    document.cookie = `IRONMAN_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={switchLanguage}
      className="tap-target focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-current/20 px-3 py-2 text-xs font-bold uppercase tracking-wide"
      aria-label={t('switchTo', { locale: nextLocale === 'bn' ? 'Bangla' : 'English' })}
      title={t('switchTo', { locale: nextLocale === 'bn' ? 'Bangla' : 'English' })}
    >
      <Languages className="h-4 w-4" aria-hidden />
      {compact ? locale.toUpperCase() : t(locale === 'bn' ? 'bangla' : 'english')}
    </button>
  )
}
