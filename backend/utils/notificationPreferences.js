const DEFAULT_NOTIFICATION_SETTINGS = {
  newLead: true,
  appointmentScheduled: true,
  aiInteraction: false,
  weeklySummary: true,
  appointmentReminders: true,
  taskReminders: true,
  marketingUpdates: true,
  propertyInquiries: true,
  showingConfirmations: true,
  hotLeads: true,
  priceChanges: false,
  contractMilestones: true,
  browserNotifications: true,
  weekendNotifications: true,
  weeklyReport: true,
  monthlyInsights: true
}

const inMemoryStore = new Map()

const normalizeUserId = (userId) => {
  if (!userId || typeof userId !== 'string') {
    return 'default-user'
  }
  return userId.trim().toLowerCase()
}

const clone = (value) => JSON.parse(JSON.stringify(value))

const getPreferences = (userId) => {
  const key = normalizeUserId(userId)
  if (!inMemoryStore.has(key)) {
    inMemoryStore.set(key, clone(DEFAULT_NOTIFICATION_SETTINGS))
  }
  return clone(inMemoryStore.get(key))
}

const updatePreferences = (userId, updates = {}) => {
  const current = getPreferences(userId)
  const next = { ...current }

  Object.entries(updates).forEach(([key, value]) => {
    if (Object.hasOwn(current, key) && typeof value === 'boolean') {
      next[key] = value
    }
  })

  const key = normalizeUserId(userId)
  inMemoryStore.set(key, next)
  return clone(next)
}

const shouldSend = (userId, channel, eventKey) => {
  const settings = getPreferences(userId)

  if (channel !== 'email') {
    return true
  }

  if (!eventKey) {
    return true
  }

  const normalizedKey = String(eventKey)
  if (Object.hasOwn(settings, normalizedKey)) {
    return Boolean(settings[normalizedKey])
  }

  return true
}

module.exports = {
  getPreferences,
  updatePreferences,
  shouldSend,
  DEFAULT_NOTIFICATION_SETTINGS
}







