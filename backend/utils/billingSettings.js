const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, '..', 'data')
const STORE_FILE = path.join(DATA_DIR, 'billing-settings.json')

const DEFAULT_BILLING_SETTINGS = {
  planName: 'Complete AI Solution',
  planStatus: 'active',
  amount: 139,
  currency: 'USD',
  managedBy: 'paypal',
  renewalDate: null,
  cancellationRequestedAt: null,
  history: [
    {
      id: 'inv-0001',
      date: '2024-07-15',
      amount: 139,
      status: 'Paid',
      description: 'Complete AI Solution - Monthly',
      invoiceUrl: null
    }
  ]
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

  if (trimmed.startsWith('blueprint-') || trimmed === 'guest-agent') {
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
    console.error('[BillingSettings] Failed to persist store:', error)
  }
}

const getEntry = (userId) => {
  const key = normalizeUserId(userId)
  const store = loadStore()

  if (!store[key]) {
    store[key] = clone(DEFAULT_BILLING_SETTINGS)
  }

  storeCache = store
  persistStore()

  return store[key]
}

const sanitizeHistory = (history) => {
  if (!Array.isArray(history)) {
    return clone(DEFAULT_BILLING_SETTINGS.history)
  }

  return history
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      id: String(entry.id || `inv-${Date.now()}`),
      date: typeof entry.date === 'string' ? entry.date : new Date().toISOString().slice(0, 10),
      amount: typeof entry.amount === 'number' ? entry.amount : Number(entry.amount) || 0,
      status: ['Paid', 'Pending', 'Failed'].includes(entry.status) ? entry.status : 'Paid',
      description: typeof entry.description === 'string' ? entry.description : undefined,
      invoiceUrl: typeof entry.invoiceUrl === 'string' ? entry.invoiceUrl : null
    }))
}

const getBillingSettings = (userId) => {
  const entry = getEntry(userId)
  const payload = {
    ...clone(DEFAULT_BILLING_SETTINGS),
    ...clone(entry),
    history: sanitizeHistory(entry.history)
  }
  return { settings: payload }
}

const updateBillingSettings = (userId, updates = {}) => {
  const entry = getEntry(userId)
  const next = {
    ...entry,
    ...updates
  }

  if (updates.history) {
    next.history = sanitizeHistory(updates.history)
  }

  storeCache[normalizeUserId(userId)] = next
  persistStore()

  return getBillingSettings(userId)
}

module.exports = {
  DEFAULT_BILLING_SETTINGS,
  getBillingSettings,
  updateBillingSettings
}

