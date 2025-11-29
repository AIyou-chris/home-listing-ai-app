const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, '..', 'data')
const STORE_FILE = path.join(DATA_DIR, 'security-settings.json')

const DEFAULT_SECURITY_SETTINGS = {
  loginNotifications: true,
  sessionTimeout: 24,
  analyticsEnabled: true
}

let storeCache = null

const clone = (value) => JSON.parse(JSON.stringify(value))

const normalizeUserId = (userId) => {
  if (!userId || typeof userId !== 'string') {
    return 'default-user'
  }

  const trimmed = userId.trim().toLowerCase()
  if (!trimmed) {
    return 'default-user'
  }

  if (trimmed.startsWith('blueprint-') || trimmed === 'demo' || trimmed === 'guest-agent') {
    return 'demo-blueprint'
  }

  return trimmed
}

const loadStore = () => {
  if (storeCache) {
    return storeCache
  }

  try {
    const raw = fs.readFileSync(STORE_FILE, 'utf8')
    storeCache = JSON.parse(raw)
  } catch (_error) {
    storeCache = {}
  }

  return storeCache
}

const persistStore = () => {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(STORE_FILE, JSON.stringify(storeCache ?? {}, null, 2), 'utf8')
  } catch (error) {
    console.error('[SecuritySettings] Failed to persist store:', error)
  }
}

const sanitizeSettings = (settings = {}) => {
  const result = clone(DEFAULT_SECURITY_SETTINGS)

  if (typeof settings.loginNotifications === 'boolean') {
    result.loginNotifications = settings.loginNotifications
  }

  if (typeof settings.analyticsEnabled === 'boolean') {
    result.analyticsEnabled = settings.analyticsEnabled
  }

  const maybeTimeout = Number(settings.sessionTimeout)
  if (Number.isFinite(maybeTimeout) && maybeTimeout > 0 && maybeTimeout <= 168) {
    result.sessionTimeout = maybeTimeout
  }

  return result
}

const getSecuritySettings = (userId) => {
  const key = normalizeUserId(userId)
  const store = loadStore()
  const entry = store[key] && typeof store[key] === 'object' ? store[key] : {}

  const settings = sanitizeSettings(entry.settings)
  store[key] = { settings }
  storeCache = store
  persistStore()

  return { settings: clone(settings) }
}

const updateSecuritySettings = (userId, updates = {}) => {
  const key = normalizeUserId(userId)
  const store = loadStore()
  const current = store[key] && typeof store[key] === 'object' ? store[key] : {}
  const nextSettings = sanitizeSettings({ ...current.settings, ...updates })

  store[key] = { settings: nextSettings }
  storeCache = store
  persistStore()

  return getSecuritySettings(userId)
}

module.exports = {
  DEFAULT_SECURITY_SETTINGS,
  getSecuritySettings,
  updateSecuritySettings
}


