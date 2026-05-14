'use client'

import { useEffect, useMemo, useState } from 'react'
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

  useEffect(() => {
    async function load() {
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
        setError(err instanceof Error ? err.message : 'Could not load services')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const decoratedCategories = useMemo(() => decorateCategories(categories, pricing), [categories, pricing])
  const decoratedClothingTypes = useMemo(() => decorateClothingTypes(clothingTypes), [clothingTypes])

  if (loading) {
    return mode === 'home' ? (
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => <CardSkeleton key={index} />)}
      </div>
    ) : (
      <TableSkeleton rows={6} />
    )
  }

  if (error) {
    return <div className="rounded-lg border border-ironman-red-100 bg-ironman-red-50 p-5 text-sm font-semibold text-ironman-red">{error}</div>
  }

  if (mode === 'pricing') {
    return (
      <>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <select className="tap-target rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 focus-ring" defaultValue="">
            <option value="">All clothing types</option>
            {decoratedClothingTypes.map((item) => <option key={item.id}>{item.name}</option>)}
          </select>
          <select className="tap-target rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 focus-ring" defaultValue="">
            <option value="">All service categories</option>
            {decoratedCategories.map((item) => <option key={item.id}>{item.name}</option>)}
          </select>
        </div>
        <div className="mt-8">
          <PricingTable categories={decoratedCategories} clothingTypes={decoratedClothingTypes} pricing={pricing} />
        </div>
      </>
    )
  }

  return (
    <>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {decoratedCategories.map((service) => (
          <article key={service.id} className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
            <Icon name={service.icon ?? 'PackageCheck'} className="h-7 w-7 text-ironman-red" aria-hidden />
            <h3 className="mt-4 text-lg font-bold text-ironman-navy">{service.name}</h3>
            <p className="mt-2 min-h-16 text-sm leading-6 text-gray-600">{service.description}</p>
            <p className="mt-4 text-sm font-semibold text-ironman-navy">Starts at {formatBdt(service.startingPrice ?? 0)}</p>
          </article>
        ))}
      </div>
      <div className="mt-8">
        <PricingTable categories={decoratedCategories} clothingTypes={decoratedClothingTypes} pricing={pricing} />
      </div>
    </>
  )
}
