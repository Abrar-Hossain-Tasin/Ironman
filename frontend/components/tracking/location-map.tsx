'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { DeliveryLocation } from '@/types'

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

type LocationMapProps = {
  locations: DeliveryLocation[]
  path?: DeliveryLocation[]
  heightClassName?: string
}

export default function LocationMap({ locations, path = [], heightClassName = 'h-72' }: LocationMapProps) {
  const validLocations = locations.filter(isValidLocation)
  const validPath = path.filter(isValidLocation)
  const center = validLocations[0]

  if (!center) {
    return (
      <div className={`${heightClassName} grid place-items-center rounded-lg border border-dashed border-ironman-navy-100 bg-white text-sm font-semibold text-gray-500`}>
        No live GPS point yet
      </div>
    )
  }

  return (
    <div className={`${heightClassName} overflow-hidden rounded-lg border border-ironman-navy-100 shadow-soft`}>
      <LeafletMap locations={validLocations} path={validPath} center={center} />
    </div>
  )
}

function LeafletMap({
  locations,
  path,
  center
}: {
  locations: DeliveryLocation[]
  path: DeliveryLocation[]
  center: DeliveryLocation
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || mapRef.current) return

    clearLeafletMarker(container)
    const map = L.map(container, { scrollWheelZoom: false }).setView(
      [Number(center.latitude), Number(center.longitude)],
      15
    )
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map)
    const layerGroup = L.layerGroup().addTo(map)
    mapRef.current = map
    layerRef.current = layerGroup

    return () => {
      layerGroup.clearLayers()
      map.remove()
      mapRef.current = null
      layerRef.current = null
      clearLeafletMarker(container)
    }
  }, [center.latitude, center.longitude])

  useEffect(() => {
    const map = mapRef.current
    const layerGroup = layerRef.current
    if (!map || !layerGroup) return

    layerGroup.clearLayers()
    const viewportLocations = path.length > 1 ? [...path, ...locations] : locations
    const points = viewportLocations.map((location) => [
      Number(location.latitude),
      Number(location.longitude)
    ] as [number, number])

    if (path.length > 1) {
      L.polyline(
        path.map((location) => [Number(location.latitude), Number(location.longitude)]),
        { color: '#D81B2A', weight: 4, opacity: 0.8 }
      ).addTo(layerGroup)
    }

    for (const location of locations) {
      L.marker([Number(location.latitude), Number(location.longitude)], { icon: markerIcon })
        .bindPopup(createPopupContent(location))
        .addTo(layerGroup)
    }

    if (points.length === 1) {
      map.setView(points[0], Math.max(map.getZoom(), 15), { animate: true })
    } else if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { animate: true, maxZoom: 15, padding: [32, 32] })
    }
  }, [locations, path])

  return <div ref={containerRef} className="h-full w-full" />
}

function clearLeafletMarker(container: HTMLDivElement & { _leaflet_id?: number }) {
  if (container._leaflet_id) delete container._leaflet_id
}

function createPopupContent(location: DeliveryLocation) {
  const container = document.createElement('div')
  container.className = 'space-y-1 text-sm'

  const name = document.createElement('p')
  name.className = 'font-semibold'
  name.textContent = location.deliveryManName
  container.appendChild(name)

  const order = document.createElement('p')
  order.textContent = location.orderNumber ? `Order ${location.orderNumber}` : 'Not attached to an order'
  container.appendChild(order)

  if (location.accuracy) {
    const accuracy = document.createElement('p')
    accuracy.textContent = `Accuracy ${Math.round(Number(location.accuracy))} m`
    container.appendChild(accuracy)
  }

  const updated = document.createElement('p')
  updated.textContent = formatUpdatedAt(location.updatedAt)
  container.appendChild(updated)

  return container
}

function isValidLocation(location: DeliveryLocation) {
  return Number.isFinite(Number(location.latitude)) && Number.isFinite(Number(location.longitude))
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat('en-BD', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Dhaka'
  }).format(new Date(value))
}
