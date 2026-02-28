import { useEffect, useRef } from 'react'
import { useDashboardRealtimeStore } from '../../state/useDashboardRealtimeStore'

const DEFAULT_EVENT_TYPES = new Set([
  'lead.created',
  'lead.updated',
  'lead.status_changed',
  'appointment.created',
  'appointment.updated',
  'reminder.outcome',
  'listing.performance.updated'
])

interface UseRealtimeRoiUpdatesOptions {
  enabled?: boolean
  debounceMs?: number
  listingId?: string | null
  eventTypes?: string[]
}

export const useRealtimeRoiUpdates = (
  onUpdate: () => void,
  options: UseRealtimeRoiUpdatesOptions = {}
) => {
  const {
    enabled = true,
    debounceMs = 500,
    listingId = null,
    eventTypes
  } = options

  const lastEvent = useDashboardRealtimeStore((state) => state.lastRealtimeEvent)
  const callbackRef = useRef(onUpdate)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    callbackRef.current = onUpdate
  }, [onUpdate])

  useEffect(() => {
    if (!enabled || !lastEvent) return

    const allowedTypes = eventTypes?.length ? new Set(eventTypes) : DEFAULT_EVENT_TYPES
    if (!allowedTypes.has(lastEvent.type)) return

    if (listingId) {
      const eventListingId = String(lastEvent.payload?.listing_id || '').trim()
      if (eventListingId && eventListingId !== listingId) return
    }

    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
    }

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      callbackRef.current()
    }, debounceMs)

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [enabled, lastEvent, debounceMs, listingId, eventTypes])
}
