'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Crosshair, Search } from 'lucide-react'

// Leaflet is client-only.
const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false })

// Default to central Dhaka.
const DEFAULT_CENTER: [number, number] = [23.7806, 90.4193]

export type AddressMapValue = {
  latitude: number | null
  longitude: number | null
  resolvedAddress?: string | null
}

type AddressMapPickerProps = {
  value: AddressMapValue
  onChange: (value: AddressMapValue) => void
  height?: number
}

type DragEndEvent = { target: { getLatLng: () => { lat: number; lng: number } } }

export function AddressMapPicker({ value, onChange, height = 280 }: AddressMapPickerProps) {
  const [iconReady, setIconReady] = useState(false)
  const iconRef = useRef<any>(null)
  const [locating, setLocating] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    import('leaflet').then((L) => {
      if (cancelled) return
      iconRef.current = new L.Icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41]
      })
      setIconReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const position: [number, number] = useMemo(() => {
    if (value.latitude != null && value.longitude != null) {
      return [value.latitude, value.longitude]
    }
    return DEFAULT_CENTER
  }, [value.latitude, value.longitude])

  function useMyLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      return
    }
    setLocating(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          resolvedAddress: value.resolvedAddress ?? null
        })
        setLocating(false)
      },
      (err) => {
        setError(err.message || 'Could not get your location')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function searchAddress(event: React.FormEvent) {
    event.preventDefault()
    if (!searchQuery.trim()) return
    setSearching(true)
    setError(null)
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(searchQuery + ', Dhaka, Bangladesh')}`
      const res = await fetch(url, { headers: { Accept: 'application/json' } })
      if (!res.ok) throw new Error('Address lookup failed')
      const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>
      if (!data.length) {
        setError('No match. Drop the pin manually instead.')
        return
      }
      const hit = data[0]
      onChange({
        latitude: Number(Number(hit.lat).toFixed(6)),
        longitude: Number(Number(hit.lon).toFixed(6)),
        resolvedAddress: hit.display_name
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Address lookup failed')
    } finally {
      setSearching(false)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { lat, lng } = event.target.getLatLng()
    onChange({
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lng.toFixed(6)),
      resolvedAddress: value.resolvedAddress ?? null
    })
  }

  return (
    <div className="space-y-2">
      <form className="flex flex-wrap items-center gap-2" onSubmit={searchAddress}>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            className="tap-target w-full rounded-lg border border-ironman-navy-100 bg-white pl-9 pr-3 py-2 text-sm focus-ring"
            placeholder="Search a landmark or area"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={searching || !searchQuery.trim()}
          className="tap-target focus-ring rounded-lg border border-ironman-navy-100 px-3 py-2 text-sm font-semibold text-ironman-navy disabled:opacity-50"
        >
          {searching ? 'Searching…' : 'Find'}
        </button>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="tap-target focus-ring inline-flex items-center gap-1 rounded-lg bg-ironman-navy px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          <Crosshair className="h-4 w-4" aria-hidden />
          {locating ? 'Locating…' : 'Use my location'}
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-ironman-navy-100" style={{ height }}>
        {iconReady ? (
          <MapContainer
            center={position}
            zoom={value.latitude != null ? 16 : 12}
            style={{ height: '100%', width: '100%' }}
            key={`${position[0]}-${position[1]}`}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker
              position={position}
              draggable
              icon={iconRef.current}
              eventHandlers={{ dragend: handleDragEnd as any }}
            />
          </MapContainer>
        ) : (
          <div className="grid h-full place-items-center text-sm text-gray-500">Loading map…</div>
        )}
      </div>

      <p className="flex items-start gap-2 text-xs text-gray-600">
        <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-ironman-red" aria-hidden />
        {value.latitude != null && value.longitude != null
          ? `Pin: ${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)}${value.resolvedAddress ? ' · ' + value.resolvedAddress : ''}`
          : 'Drag the marker, search an address, or use your current location to pin the exact spot.'}
      </p>
      {error ? (
        <p className="rounded-lg bg-ironman-red-50 px-3 py-2 text-xs font-semibold text-ironman-red">{error}</p>
      ) : null}
    </div>
  )
}
