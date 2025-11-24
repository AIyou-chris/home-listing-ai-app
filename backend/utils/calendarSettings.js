const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, '..', 'data')
const STORE_FILE = path.join(DATA_DIR, 'calendar-settings.json')

const DEFAULT_CALENDAR_SETTINGS = {
  integrationType: null,
  aiScheduling: true,
  conflictDetection: true,
  emailReminders: true,
  autoConfirm: false,
  workingHours: {
    start: '09:00',
    end: '17:00'
  },
  workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  defaultDuration: 30,
  bufferTime: 15,
  smsReminders: false,
  newAppointmentAlerts: true
}

const DEFAULT_CONNECTION = {
  provider: null,
  email: null,
  connectedAt: null,
  status: 'disconnected',
  metadata: {}
}

let storeCache = null

const loadStore = () => {
  if (storeCache) {
    return storeCache
  }

  try {
    const raw = fs.readFileSync(STORE_FILE, 'utf8')
    storeCache = JSON.parse(raw)
  } catch (error) {
    storeCache = {}
  }

  return storeCache
}

const persistStore = () => {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(STORE_FILE, JSON.stringify(storeCache ?? {}, null, 2), 'utf8')
  } catch (error) {
    console.error('[CalendarSettings] Failed to persist store:', error)
  }
}

const normalizeUserId = (userId) => {
  if (!userId || typeof userId !== 'string') {
    return 'default-user'
  }

  const trimmed = userId.trim().toLowerCase()

  if (trimmed.startsWith('blueprint-')) {
    return 'demo-blueprint'
  }

  if (trimmed === 'guest-agent') {
    return 'demo-blueprint'
  }

  return trimmed
}

const clone = (value) => JSON.parse(JSON.stringify(value))

const sanitizeConnection = (connection) => {
  if (!connection) {
    return clone(DEFAULT_CONNECTION)
  }

  return {
    provider: connection.provider || null,
    email: connection.email || null,
    connectedAt: connection.connectedAt || null,
    status: connection.status || (connection.provider ? 'active' : 'disconnected'),
    metadata: connection.metadata ? { ...connection.metadata } : {}
  }
}

const getEntry = (userId) => {
  const store = loadStore()
  const key = normalizeUserId(userId)

  if (!store[key]) {
    store[key] = {
      settings: clone(DEFAULT_CALENDAR_SETTINGS),
      connection: clone(DEFAULT_CONNECTION)
    }
  }

  storeCache = store
  persistStore()

  return store[key]
}

const getCalendarSettings = (userId) => {
  const entry = getEntry(userId)
  return {
    settings: clone(entry.settings),
    connection: sanitizeConnection(entry.connection)
  }
}

const coerceWorkingHours = (value, fallback) => {
  if (!value || typeof value !== 'object') {
    return clone(fallback)
  }

  const start = typeof value.start === 'string' ? value.start : fallback.start
  const end = typeof value.end === 'string' ? value.end : fallback.end
  return { start, end }
}

const coerceWorkingDays = (value, fallback) => {
  if (!Array.isArray(value)) {
    return [...fallback]
  }

  return value
    .map((day) => String(day || '').trim().toLowerCase())
    .filter(Boolean)
}

const updateCalendarSettings = (userId, updates = {}) => {
  const entry = getEntry(userId)
  const allowedKeys = Object.keys(DEFAULT_CALENDAR_SETTINGS)
  const nextSettings = { ...entry.settings }

  Object.entries(updates).forEach(([key, value]) => {
    if (!allowedKeys.includes(key)) {
      return
    }

    switch (key) {
      case 'workingHours':
        nextSettings.workingHours = coerceWorkingHours(value, entry.settings.workingHours)
        break
      case 'workingDays':
        nextSettings.workingDays = coerceWorkingDays(value, entry.settings.workingDays)
        break
      case 'integrationType':
        if (value === 'google' || value === 'apple' || value === 'outlook' || value === null) {
          nextSettings.integrationType = value
        }
        break
      case 'defaultDuration':
      case 'bufferTime':
        {
          const numeric = Number(value)
          if (Number.isFinite(numeric) && numeric >= 0) {
            nextSettings[key] = numeric
          }
        }
        break
      case 'aiScheduling':
      case 'conflictDetection':
      case 'emailReminders':
      case 'autoConfirm':
      case 'smsReminders':
      case 'newAppointmentAlerts':
        nextSettings[key] = Boolean(value)
        break
      default:
        nextSettings[key] = value
    }
  })

  entry.settings = nextSettings
  persistStore()

  return getCalendarSettings(userId)
}

const saveCalendarConnection = (userId, connection = {}) => {
  const entry = getEntry(userId)
  const provider = connection.provider || 'google'
  const connectedAt = connection.connectedAt || new Date().toISOString()

  entry.connection = {
    provider,
    email: connection.email || entry.connection.email || null,
    connectedAt,
    status: connection.status || 'active',
    metadata: {
      ...(entry.connection.metadata || {}),
      ...(connection.metadata || {})
    }
  }

  if (provider) {
    entry.settings.integrationType = provider
  }

  persistStore()

  return getCalendarSettings(userId)
}

module.exports = {
  DEFAULT_CALENDAR_SETTINGS,
  getCalendarSettings,
  updateCalendarSettings,
  saveCalendarConnection
}


