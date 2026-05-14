'use client'

import { useEffect, useState } from 'react'
import { apiFetch, apiUrl } from '@/lib/api'
import type { DeliveryLocation } from '@/types'

type LiveLocationState = 'idle' | 'connecting' | 'live' | 'polling' | 'waiting' | 'error'

type LiveLocationResult = {
  location: DeliveryLocation | null
  path: DeliveryLocation[]
  state: LiveLocationState
  error: string | null
}

export function useOrderLiveLocation(
  orderId: string | undefined,
  _token: string | null,
  enabled: boolean
): LiveLocationResult {
  const [location, setLocation] = useState<DeliveryLocation | null>(null)
  const [path, setPath] = useState<DeliveryLocation[]>([])
  const [state, setState] = useState<LiveLocationState>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !orderId) {
      setLocation(null)
      setPath([])
      setState('idle')
      setError(null)
      return
    }

    let cancelled = false
    let pollTimer: ReturnType<typeof setInterval> | null = null
    const controller = new AbortController()

    async function readLatest(nextState: LiveLocationState = 'polling') {
      try {
        const nextLocation = await apiFetch<DeliveryLocation>(`/location/orders/${orderId}`)
        if (!cancelled) {
          setLocation(nextLocation)
          setPath((current) => appendPath(current, nextLocation))
          setState(nextState)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setState('waiting')
          setError(err instanceof Error ? err.message : 'Waiting for live GPS')
        }
      }
    }

    function startPolling() {
      if (pollTimer) return
      void readLatest('polling')
      pollTimer = setInterval(() => void readLatest('polling'), 5000)
    }

    async function startStream() {
      setState('connecting')
      setError(null)
      void readLatest('connecting')

      try {
        const response = await fetch(apiUrl(`/location/orders/${orderId}/stream`), {
          headers: {
            Accept: 'text/event-stream'
          },
          cache: 'no-store',
          credentials: 'include',
          signal: controller.signal
        })

        if (!response.ok || !response.body) {
          throw new Error(`Live stream unavailable (${response.status})`)
        }

        setState('live')
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (!cancelled) {
          const { value, done } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          buffer = buffer.replace(/\r\n/g, '\n')
          const blocks = buffer.split('\n\n')
          buffer = blocks.pop() ?? ''

          for (const block of blocks) {
            const nextLocation = parseSseLocation(block)
            if (nextLocation) {
              setLocation(nextLocation)
              setPath((current) => appendPath(current, nextLocation))
              setState('live')
              setError(null)
            }
          }
        }

        if (!cancelled) {
          startPolling()
        }
      } catch (err) {
        if (!cancelled && !controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Live stream unavailable')
          startPolling()
        }
      }
    }

    void startStream()

    return () => {
      cancelled = true
      controller.abort()
      if (pollTimer) {
        clearInterval(pollTimer)
      }
    }
  }, [enabled, orderId])

  return { location, path, state, error }
}

function appendPath(current: DeliveryLocation[], next: DeliveryLocation) {
  const lat = Number(next.latitude)
  const lng = Number(next.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return current
  const previous = current[current.length - 1]
  if (previous && Number(previous.latitude) === lat && Number(previous.longitude) === lng) {
    return current
  }
  return [...current.slice(-49), next]
}

function parseSseLocation(block: string): DeliveryLocation | null {
  const data = block
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n')

  if (!data) return null

  try {
    return JSON.parse(data) as DeliveryLocation
  } catch {
    return null
  }
}
