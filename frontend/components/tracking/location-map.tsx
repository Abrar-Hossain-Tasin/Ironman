'use client'

import { useEffect, useMemo } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
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
      <MapContainer
        center={[Number(center.latitude), Number(center.longitude)]}
        zoom={15}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewport locations={validPath.length > 1 ? [...validPath, ...validLocations] : validLocations} />
        {validPath.length > 1 ? (
          <Polyline
            positions={validPath.map((location) => [Number(location.latitude), Number(location.longitude)])}
            pathOptions={{ color: '#D81B2A', weight: 4, opacity: 0.8 }}
          />
        ) : null}
        {validLocations.map((location) => (
          <Marker
            key={`${location.deliveryManId}-${location.orderId ?? 'idle'}`}
            position={[Number(location.latitude), Number(location.longitude)]}
            icon={markerIcon}
          >
            <Popup>
              <div className="space-y-1 text-sm">
                <p className="font-semibold">{location.deliveryManName}</p>
                {location.orderNumber ? <p>Order {location.orderNumber}</p> : <p>Not attached to an order</p>}
                {location.accuracy ? <p>Accuracy {Math.round(Number(location.accuracy))} m</p> : null}
                <p>{formatUpdatedAt(location.updatedAt)}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

function MapViewport({ locations }: { locations: DeliveryLocation[] }) {
  const map = useMap()
  const bounds = useMemo(() => {
    const points = locations.map((location) => [
      Number(location.latitude),
      Number(location.longitude)
    ] as [number, number])
    return L.latLngBounds(points)
  }, [locations])

  useEffect(() => {
    if (!locations.length) return
    if (locations.length === 1) {
      const center = bounds.getCenter()
      map.setView([center.lat, center.lng], Math.max(map.getZoom(), 15), { animate: true })
      return
    }
    map.fitBounds(bounds, { animate: true, maxZoom: 15, padding: [32, 32] })
  }, [bounds, locations.length, map])

  return null
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
