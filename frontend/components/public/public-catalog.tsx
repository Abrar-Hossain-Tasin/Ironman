'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Icon } from '@/components/ui/icon'
import { PricingTable } from '@/components/ui/pricing-table'
import { CardSkeleton, TableSkeleton } from '@/components/ui/skeleton'
import { apiFetch, endpoints } from '@/lib/api'
import { decorateCategories, decorateClothingTypes } from '@/lib/catalog'
import { formatBdt } from '@/lib/utils'
import type { ClothingType, PricingCell, ServiceCategory } from '@/types'

type PublicCatalogProps = {
  mode: 'home' | 'pricing'
}

export function PublicCatalog({ mode }: PublicCatalogProps) {
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [clothingTypes, setClothingTypes] = useState<ClothingType[]>([])
  const [pricing, setPricing] = useState<PricingCell[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [nextCategories, nextClothingTypes, nextPricing] = await Promise.all([
        apiFetch<ServiceCategory[]>(endpoints.categories),
        apiFetch<ClothingType[]>(endpoints.clothingTypes),
        apiFetch<PricingCell[]>(endpoints.pricing)
      ])
      setCategories(nextCategories)
      setClothingTypes(nextClothingTypes)
      setPricing(nextPricing)
    } catch (err) {
      // Surface a friendly message; the raw error stays in the console for debugging.
      if (typeof console !== 'undefined') console.warn('Catalog load failed:', err)
      setError("We couldn't load our service catalogue right now. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const [clothingFilter, setClothingFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const decoratedCategories = useMemo(() => decorateCategories(categories, pricing), [categories, pricing])
  const decoratedClothingTypes = useMemo(() => decorateClothingTypes(clothingTypes), [clothingTypes])

  const visibleClothingTypes = useMemo(
    () => (clothingFilter ? decoratedClothingTypes.filter((item) => item.id === clothingFilter) : decoratedClothingTypes),
    [decoratedClothingTypes, clothingFilter]
  )
  const visibleCategories = useMemo(
    () => (categoryFilter ? decoratedCategories.filter((item) => item.id === categoryFilter) : decoratedCategories),
    [decoratedCategories, categoryFilter]
  )

  if (loading) {
    return mode === 'home' ? (
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" aria-busy="true" aria-label="Loading services">
        {Array.from({ length: 5 }).map((_, index) => <CardSkeleton key={index} />)}
      </div>
    ) : (
      <TableSkeleton rows={6} />
    )
  }

  if (error) {
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-4 rounded-xl border border-ironman-red-100 bg-ironman-red-50 p-5 text-sm text-ironman-red sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden />
          <p className="font-body font-semibold leading-relaxed">{error}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="tap-target focus-ring inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-lg border border-ironman-red/30 bg-white px-4 py-2 font-body text-sm font-semibold text-ironman-red transition-colors hover:bg-ironman-red hover:text-white"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Try again
        </button>
      </div>
    )
  }

  // Empty-state guard — covers the case where the API responds but with no data.
  const hasAnyData = decoratedCategories.length > 0 || decoratedClothingTypes.length > 0
  if (!hasAnyData) {
    return (
      <p className="rounded-xl border border-dashed border-ironman-navy-100 bg-ironman-navy-50 p-6 text-center font-body text-sm text-gray-600">
        Our service catalogue is being prepared. Please check back shortly.
      </p>
    )
  }

  if (mode === 'pricing') {
    return (
      <>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <select
            className="tap-target rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 focus-ring"
            value={clothingFilter}
            onChange={(event) => setClothingFilter(event.target.value)}
            aria-label="Filter by clothing type"
          >
            <option value="">All clothing types</option>
            {decoratedClothingTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select
            className="tap-target rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 focus-ring"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            aria-label="Filter by service category"
          >
            <option value="">All service categories</option>
            {decoratedCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
        <div className="mt-8">
          {visibleClothingTypes.length === 0 || visibleCategories.length === 0 ? (
            <p className="rounded-lg border border-dashed border-ironman-navy-100 bg-white p-6 text-center text-sm text-gray-600">
              No pricing matches the selected filters.
            </p>
          ) : (
            <PricingTable categories={visibleCategories} clothingTypes={visibleClothingTypes} pricing={pricing} />
          )}
        </div>
      </>
    )
  }

  return (
    <>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {decoratedCategories.map((service) => (
          <article key={service.id} className="flex h-full flex-col rounded-xl border border-ironman-navy-100 bg-white p-5 shadow-soft">
            <Icon name={service.icon ?? 'PackageCheck'} className="h-7 w-7 text-ironman-red" aria-hidden />
            <h3 className="mt-4 font-display text-lg font-bold leading-snug text-ironman-navy">{service.name}</h3>
            <p className="mt-2 line-clamp-3 font-body text-sm leading-6 text-gray-600">{service.description}</p>
            <p className="mt-auto pt-4 font-body text-sm font-semibold text-ironman-navy">
              Starts at {formatBdt(service.startingPrice ?? 0)}
            </p>
          </article>
        ))}
      </div>
      <div className="mt-8">
        <PricingTable categories={decoratedCategories} clothingTypes={decoratedClothingTypes} pricing={pricing} />
      </div>
    </>
  )
}
