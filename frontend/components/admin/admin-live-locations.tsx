'use client'

import dynamic from 'next/dynamic'
import { Component, useEffect, useState, type ReactNode } from 'react'
import { RadioTower } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import type { DeliveryLocation } from '@/types'

const LocationMap = dynamic(() => import('@/components/tracking/location-map'), {
  ssr: false,
  loading: () => <div className="h-80 animate-pulse rounded-lg bg-ironman-navy-50" />
})

class MapErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="grid h-80 place-items-center rounded-lg border border-dashed border-ironman-navy-100 bg-ironman-navy-50 px-4 text-center text-sm font-semibold text-ironman-navy">
          Live map is temporarily unavailable. GPS updates are still refreshing in the background.
        </div>
      )
    }

    return this.props.children
  }
}

export function AdminLiveLocations() {
  const token = useAuthStore((state) => state.accessToken)
  const [locations, setLocations] = useState<DeliveryLocation[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false

    async function load() {
      try {
        const nextLocations = await apiFetch<DeliveryLocation[]>('/location/all', { token })
        if (!cancelled) {
          setLocations(nextLocations)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load live locations')
        }
      }
    }

    void load()
    const timer = setInterval(() => void load(), 5000)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [token])

  return (
    <section className="mb-6 rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-ironman-navy">
            <RadioTower className="h-5 w-5 text-ironman-red" aria-hidden />
            Live delivery map
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {error ?? `${locations.length} delivery ${locations.length === 1 ? 'agent' : 'agents'} reporting GPS`}
          </p>
        </div>
        <span className="rounded-full bg-ironman-navy-50 px-3 py-1 text-xs font-semibold text-ironman-navy">
          Refreshes every 5s
        </span>
      </div>
      <MapErrorBoundary>
        <LocationMap locations={locations} heightClassName="h-80" />
      </MapErrorBoundary>
    </section>
  )
}
