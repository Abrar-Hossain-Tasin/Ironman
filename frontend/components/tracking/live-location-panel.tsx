'use client'

import dynamic from 'next/dynamic'
import { Navigation, RadioTower } from 'lucide-react'
import type { DeliveryLocation } from '@/types'

const LocationMap = dynamic(() => import('@/components/tracking/location-map'), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-lg bg-ironman-navy-50" />
})

type LiveLocationPanelProps = {
  title: string
  location: DeliveryLocation | null
  path?: DeliveryLocation[]
  state: 'idle' | 'connecting' | 'live' | 'polling' | 'waiting' | 'error'
  error?: string | null
}

export function LiveLocationPanel({ title, location, path = [], state, error }: LiveLocationPanelProps) {
  const visibleLocation = location ? [location] : []

  return (
    <section className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-ironman-navy">
            <Navigation className="h-5 w-5 text-ironman-red" aria-hidden />
            {title}
          </h2>
          <p className="mt-1 text-sm text-gray-600">{locationStatus(state, location, error)}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-ironman-navy-50 px-3 py-1 text-xs font-semibold text-ironman-navy">
          <RadioTower className="h-4 w-4 text-ironman-red" aria-hidden />
          {state === 'live' ? 'Live' : state === 'polling' ? 'Updating' : 'Standby'}
        </span>
      </div>

      <LocationMap locations={visibleLocation} path={path} />

      {location ? (
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Delivery man</dt>
            <dd className="mt-1 font-semibold text-ironman-navy">{location.deliveryManName}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Accuracy</dt>
            <dd className="mt-1 font-semibold text-ironman-navy">
              {location.accuracy ? `${Math.round(Number(location.accuracy))} m` : 'GPS'}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Updated</dt>
            <dd className="mt-1 font-semibold text-ironman-navy">{formatUpdatedAt(location.updatedAt)}</dd>
          </div>
        </dl>
      ) : null}
    </section>
  )
}

function locationStatus(
  state: LiveLocationPanelProps['state'],
  location: DeliveryLocation | null,
  error?: string | null
) {
  if (location) return `Last seen near ${Number(location.latitude).toFixed(5)}, ${Number(location.longitude).toFixed(5)}`
  if (state === 'connecting') return 'Connecting to the live GPS stream'
  if (state === 'waiting') return 'Waiting for the delivery man to share GPS'
  if (state === 'error' && error) return error
  if (state === 'idle') return 'Map appears when a pickup or delivery agent is active'
  return 'Checking for the latest GPS point'
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat('en-BD', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Dhaka'
  }).format(new Date(value))
}
