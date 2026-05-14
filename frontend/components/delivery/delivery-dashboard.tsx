'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RequireAuth } from '@/components/auth/require-auth'
import { DeliveryEarningsCard } from '@/components/delivery/delivery-earnings-card'
import { AssignmentCard } from '@/components/tasks/assignment-card'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import type { Assignment } from '@/types'

export function DeliveryDashboard() {
  const router = useRouter()
  const token = useAuthStore((state) => state.accessToken)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [trackingMessage, setTrackingMessage] = useState<string | null>(null)

  async function load() {
    if (!token) return
    const data = await apiFetch<Assignment[]>('/delivery/assignments', { token })
    setAssignments(data)
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    const activeTask = assignments.find(
      (assignment) =>
        (assignment.assignmentType === 'pickup' || assignment.assignmentType === 'delivery') &&
        (assignment.status === 'accepted' || assignment.status === 'in_progress')
    )

    if (!activeTask || !token) {
      setIsTracking(false)
      setTrackingMessage(null)
      return
    }

    if (!('geolocation' in navigator)) {
      setIsTracking(false)
      setTrackingMessage('GPS is not available in this browser')
      return
    }

    const trackingAssignment = activeTask
    let cancelled = false
    setIsTracking(true)
    setTrackingMessage(`Sharing GPS for ${trackingAssignment.orderNumber}`)

    async function pushPosition(position: GeolocationPosition) {
      try {
        await apiFetch('/delivery/location', {
          method: 'POST',
          token,
          body: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            orderId: trackingAssignment.orderId
          }
        })
        if (!cancelled) {
          setTrackingMessage(`Live GPS active for ${trackingAssignment.orderNumber}`)
        }
      } catch (err) {
        if (!cancelled) {
          setTrackingMessage(err instanceof Error ? err.message : 'Could not share GPS')
        }
      }
    }

    navigator.geolocation.getCurrentPosition(
      (position) => void pushPosition(position),
      (err) => {
        if (!cancelled) setTrackingMessage(err.message)
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    )

    const watchId = navigator.geolocation.watchPosition(
      (position) => void pushPosition(position),
      (err) => {
        if (!cancelled) {
          setIsTracking(false)
          setTrackingMessage(err.message)
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    )

    return () => {
      cancelled = true
      navigator.geolocation.clearWatch(watchId)
    }
  }, [assignments, token])

  async function action(assignment: Assignment, path: 'accept' | 'start') {
    if (!token) return
    await apiFetch(`/delivery/assignments/${assignment.id}/${path}`, {
      method: 'PUT',
      token
    })
    setMessage(`${assignment.orderNumber} ${path}`)
    await load()
  }

  // Bumped after an assignment action completes so the earnings card re-fetches.
  // The action itself doesn't change earnings — but recording cash does, and
  // both happen on the same dashboard, so refreshing on any state change keeps
  // the number honest with minimal complexity.
  const earningsRefreshKey = assignments.length + (message ? 1 : 0)

  return (
    <RequireAuth roles={['delivery_man']}>
      <div className="mb-4">
        <DeliveryEarningsCard token={token} refreshKey={earningsRefreshKey} />
      </div>

      {isTracking && (
        <div className="mb-4 flex items-center gap-2 text-xs font-medium text-green-600">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
          </span>
          {trackingMessage ?? 'Live GPS tracking active'}
        </div>
      )}
      {!isTracking && trackingMessage ? (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">{trackingMessage}</p>
      ) : null}

      {message ? (
        <p className="mb-4 rounded-lg bg-ironman-navy-50 px-3 py-2 text-sm font-semibold text-ironman-navy">
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {assignments.map((assignment) => (
          <AssignmentCard
            key={assignment.id}
            assignment={assignment}
            onAccept={(item) => action(item, 'accept')}
            onStart={(item) => action(item, 'start')}
            onComplete={(item) => router.push(`/delivery/assignments/${item.id}`)}
          />
        ))}
      </div>
    </RequireAuth>
  )
}
