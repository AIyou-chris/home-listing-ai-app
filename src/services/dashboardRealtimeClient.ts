import { toast } from 'react-hot-toast'
import { getApiBaseUrl } from '../lib/api'
import { fetchCommandCenterSnapshot } from './dashboardCommandService'
import { supabase } from './supabase'
import { useDashboardRealtimeStore, type DashboardRealtimeEventEnvelope } from '../state/useDashboardRealtimeStore'

let socket: WebSocket | null = null
let reconnectTimer: number | null = null
let reconnectAttempt = 0
let stopped = false
let connecting = false
let commandCenterRefreshTimer: number | null = null
let commandCenterRefreshInFlight = false
let commandCenterRefreshPending = false

const seenEventKeys = new Map<string, number>()
const EVENT_KEY_TTL_MS = 2 * 60 * 1000

const buildWsBaseUrl = () => {
  const apiBase = getApiBaseUrl()
  if (apiBase.startsWith('https://')) return apiBase.replace('https://', 'wss://')
  if (apiBase.startsWith('http://')) return apiBase.replace('http://', 'ws://')
  return apiBase
}

const pruneSeenEventKeys = () => {
  const cutoff = Date.now() - EVENT_KEY_TTL_MS
  for (const [key, ts] of Array.from(seenEventKeys.entries())) {
    if (ts < cutoff) seenEventKeys.delete(key)
  }
}

const getEventIdentityKey = (event: DashboardRealtimeEventEnvelope) => {
  const payload = event.payload || {}
  const entityId =
    (payload.lead_id as string | undefined) ||
    (payload.appointment_id as string | undefined) ||
    (payload.listing_id as string | undefined) ||
    event.type
  return `${event.type}:${entityId || 'none'}:${event.ts}`
}

const showToast = (title: string, body: string) => {
  toast(`${title}\n${body}`, { duration: 4000 })
}

const refreshCommandCenterSnapshot = async () => {
  if (stopped) return
  if (commandCenterRefreshInFlight) {
    commandCenterRefreshPending = true
    return
  }
  commandCenterRefreshInFlight = true
  try {
    const response = await fetchCommandCenterSnapshot()
    useDashboardRealtimeStore.getState().setCommandCenter({
      stats: response.stats,
      queues: response.queues
    })
  } catch (_) {
    // no-op: command center page can still rely on existing local state
  } finally {
    commandCenterRefreshInFlight = false
    if (commandCenterRefreshPending) {
      commandCenterRefreshPending = false
      scheduleCommandCenterRefresh()
    }
  }
}

const scheduleCommandCenterRefresh = () => {
  if (commandCenterRefreshTimer) {
    window.clearTimeout(commandCenterRefreshTimer)
  }
  commandCenterRefreshTimer = window.setTimeout(() => {
    commandCenterRefreshTimer = null
    void refreshCommandCenterSnapshot()
  }, 750)
}

const handleRealtimeToast = (event: DashboardRealtimeEventEnvelope) => {
  if (event.type === 'lead.created') {
    showToast('New lead captured', 'Tap to open and follow up.')
    return
  }

  if (event.type !== 'reminder.outcome') return
  const outcome = String(event.payload?.outcome || '').toLowerCase()
  if (outcome === 'confirmed') {
    showToast('Appointment confirmed', 'Nice — one less no-show.')
  } else if (outcome === 'reschedule_requested') {
    showToast('Reschedule requested', 'Tap to pick a new time.')
  } else if (outcome === 'voicemail_left') {
    showToast('Voicemail left', 'We’ll try again if needed.')
  } else if (outcome === 'failed') {
    showToast('Reminder failed', 'Tap to retry or call the lead.')
  }
}

const handleRealtimeEvent = (event: DashboardRealtimeEventEnvelope) => {
  if (!event || typeof event !== 'object') return
  if (!event.type || event.v !== 1) return

  pruneSeenEventKeys()
  const key = getEventIdentityKey(event)
  if (seenEventKeys.has(key)) return
  seenEventKeys.set(key, Date.now())

  useDashboardRealtimeStore.getState().applyRealtimeEvent(event)
  handleRealtimeToast(event)
  if (event.type !== 'system.ready') {
    scheduleCommandCenterRefresh()
  }
}

const scheduleReconnect = () => {
  if (stopped || reconnectTimer) return
  reconnectAttempt += 1
  const delay = Math.min(15000, 1000 * Math.max(1, reconnectAttempt))
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null
    void startDashboardRealtime()
  }, delay)
}

const closeSocket = () => {
  if (socket) {
    try {
      socket.close()
    } catch (_) {
      // no-op
    }
  }
  socket = null
}

export const startDashboardRealtime = async () => {
  if (connecting || socket || stopped) return
  connecting = true

  try {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) return

    const wsUrl = `${buildWsBaseUrl()}/ws?token=${encodeURIComponent(token)}`
    socket = new WebSocket(wsUrl)

    socket.addEventListener('open', () => {
      reconnectAttempt = 0
      scheduleCommandCenterRefresh()
    })

    socket.addEventListener('message', (messageEvent) => {
      try {
        const event = JSON.parse(String(messageEvent.data)) as DashboardRealtimeEventEnvelope
        handleRealtimeEvent(event)
      } catch (_) {
        // ignore malformed payloads
      }
    })

    socket.addEventListener('close', () => {
      closeSocket()
      scheduleReconnect()
    })

    socket.addEventListener('error', () => {
      closeSocket()
      scheduleReconnect()
    })
  } finally {
    connecting = false
  }
}

export const stopDashboardRealtime = () => {
  stopped = true
  if (reconnectTimer) {
    window.clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (commandCenterRefreshTimer) {
    window.clearTimeout(commandCenterRefreshTimer)
    commandCenterRefreshTimer = null
  }
  commandCenterRefreshPending = false
  closeSocket()
}

export const resumeDashboardRealtime = () => {
  stopped = false
  void startDashboardRealtime()
}
