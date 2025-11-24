const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, '..', 'data')
const STORE_FILE = path.join(DATA_DIR, 'email-settings.json')

const DEFAULT_EMAIL_SETTINGS = {
  integrationType: 'forwarding',
  aiEmailProcessing: true,
  autoReply: true,
  leadScoring: true,
  followUpSequences: true,
  fromEmail: '',
  fromName: '',
  signature: '',
  trackOpens: false
}

const DEFAULT_CONNECTIONS = []

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
    console.error('[EmailSettings] Failed to persist store:', error)
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

const sanitizeConnections = (connections) =>
  connections.map(({ credentials, ...rest }) => ({ ...rest }))

const getEntry = (userId) => {
  const store = loadStore()
  const key = normalizeUserId(userId)

  if (!store[key]) {
    store[key] = {
      settings: clone(DEFAULT_EMAIL_SETTINGS),
      connections: clone(DEFAULT_CONNECTIONS)
    }
  }

  storeCache = store
  persistStore()

  return store[key]
}

const getEmailSettings = (userId) => {
  const entry = getEntry(userId)
  return {
    settings: clone(entry.settings),
    connections: sanitizeConnections(entry.connections)
  }
}

const updateEmailSettings = (userId, updates = {}) => {
  const entry = getEntry(userId)
  const allowedKeys = Object.keys(DEFAULT_EMAIL_SETTINGS)
  const nextSettings = { ...entry.settings }

  Object.entries(updates).forEach(([key, value]) => {
    if (allowedKeys.includes(key)) {
      nextSettings[key] = value
    }
  })

  entry.settings = nextSettings
  persistStore()

  return getEmailSettings(userId)
}

const connectEmailProvider = (userId, provider, emailAddress, options = {}) => {
  const entry = getEntry(userId)
  const now = new Date().toISOString()
  const fallbackEmail = emailAddress || entry.settings.fromEmail || `${normalizeUserId(userId)}@example.com`
  const email = fallbackEmail.trim() || `${normalizeUserId(userId)}@example.com`

  const connection = {
    provider,
    email,
    connectedAt: now,
    status: 'active',
    credentials: options.credentials ? { ...options.credentials } : undefined
  }

  const filtered = entry.connections.filter((item) => item.provider !== provider)
  entry.connections = [...filtered, connection]

  if (provider === 'gmail') {
    entry.settings.integrationType = 'oauth'
    entry.settings.fromEmail = email
    if (!entry.settings.fromName) {
      entry.settings.fromName = email.split('@')[0]
    }
  }

  persistStore()

  return sanitizeConnections(entry.connections)
}

const disconnectEmailProvider = (userId, provider) => {
  const entry = getEntry(userId)
  entry.connections = entry.connections.filter((item) => item.provider !== provider)

  if (provider === 'gmail') {
    const stillConnected = entry.connections.some((item) => item.provider === 'gmail')
    if (!stillConnected) {
      entry.settings.integrationType = 'forwarding'
    }
  }

  persistStore()

  return sanitizeConnections(entry.connections)
}

module.exports = {
  DEFAULT_EMAIL_SETTINGS,
  getEmailSettings,
  updateEmailSettings,
  connectEmailProvider,
  disconnectEmailProvider
}
