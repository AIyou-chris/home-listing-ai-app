const { supabaseAdmin } = require('../services/supabase');

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
};

const DEFAULT_CONNECTION = {
  provider: null,
  email: null,
  connectedAt: null,
  status: 'disconnected',
  metadata: {},
  credentials: {}
};

// In-memory cache for demo users only
const demoStore = new Map();

const isUuid = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

const normalizeUserId = (userId) => {
  if (!userId || typeof userId !== 'string') return 'default-user';
  const trimmed = userId.trim().toLowerCase();
  if (trimmed.startsWith('blueprint-') || trimmed === 'guest-agent') return 'demo-blueprint';
  return trimmed;
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const sanitizeConnection = (connection) => {
  if (!connection) return clone(DEFAULT_CONNECTION);
  return {
    provider: connection.provider || null,
    email: connection.email || null,
    connectedAt: connection.connectedAt || null,
    status: connection.status || (connection.provider ? 'active' : 'disconnected'),
    metadata: connection.metadata ? { ...connection.metadata } : {}
    // Exclude credentials from sanitized output
  };
};

const getEntry = async (userId) => {
  const normId = normalizeUserId(userId);

  // Handle Demo Users (In-Memory)
  if (!isUuid(normId)) {
    if (!demoStore.has(normId)) {
      demoStore.set(normId, {
        settings: clone(DEFAULT_CALENDAR_SETTINGS),
        connection: clone(DEFAULT_CONNECTION)
      });
    }
    return demoStore.get(normId);
  }

  // Handle Real Users (Supabase)
  try {
    const { data, error } = await supabaseAdmin
      .from('user_settings')
      .select('data')
      .eq('user_id', normId)
      .eq('category', 'calendar')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = Row not found
      console.error('[CalendarSettings] DB Fetch Error:', error.message);
    }

    if (data?.data) {
      // Merge with defaults to ensure field completeness
      return {
        settings: { ...DEFAULT_CALENDAR_SETTINGS, ...(data.data.settings || {}) },
        connection: { ...DEFAULT_CONNECTION, ...(data.data.connection || {}) }
      };
    }
  } catch (err) {
    console.error('[CalendarSettings] Unexpected error fetching:', err);
  }

  // Fallback / First Time
  return {
    settings: clone(DEFAULT_CALENDAR_SETTINGS),
    connection: clone(DEFAULT_CONNECTION)
  };
};

const saveEntry = async (userId, entry) => {
  const normId = normalizeUserId(userId);

  // Handle Demo Users
  if (!isUuid(normId)) {
    demoStore.set(normId, entry);
    return;
  }

  // Handle Real Users
  try {
    const { error } = await supabaseAdmin
      .from('user_settings')
      .upsert({
        user_id: normId,
        category: 'calendar',
        data: entry,
        updated_at: new Date()
      }, { onConflict: 'user_id, category' });

    if (error) {
      console.error('[CalendarSettings] DB Save Error:', error.message);
    }
  } catch (err) {
    console.error('[CalendarSettings] Unexpected error saving:', err);
  }
};

const getCalendarSettings = async (userId) => {
  const entry = await getEntry(userId);
  return {
    settings: clone(entry.settings),
    connection: sanitizeConnection(entry.connection)
  };
};

const coerceWorkingHours = (value, fallback) => {
  if (!value || typeof value !== 'object') return clone(fallback);
  const start = typeof value.start === 'string' ? value.start : fallback.start;
  const end = typeof value.end === 'string' ? value.end : fallback.end;
  return { start, end };
};

const updateCalendarSettings = async (userId, updates = {}) => {
  const entry = await getEntry(userId);
  const allowedKeys = Object.keys(DEFAULT_CALENDAR_SETTINGS);
  const nextSettings = { ...entry.settings };

  Object.entries(updates).forEach(([key, value]) => {
    if (!allowedKeys.includes(key)) return;

    switch (key) {
      case 'workingHours':
        nextSettings.workingHours = coerceWorkingHours(value, entry.settings.workingHours);
        break;
      case 'workingDays':
        nextSettings.workingDays = (Array.isArray(value) ? value : [])
          .map(d => String(d).trim().toLowerCase())
          .filter(Boolean);
        break;
      case 'integrationType':
        if (value === 'google' || value === 'apple' || value === 'outlook' || value === null) {
          nextSettings.integrationType = value;
        }
        break;
      case 'defaultDuration':
      case 'bufferTime':
        const numeric = Number(value);
        if (Number.isFinite(numeric) && numeric >= 0) nextSettings[key] = numeric;
        break;
      default:
        // boolean fields
        if (typeof DEFAULT_CALENDAR_SETTINGS[key] === 'boolean') {
          nextSettings[key] = Boolean(value);
        } else {
          nextSettings[key] = value;
        }
    }
  });

  entry.settings = nextSettings;
  await saveEntry(userId, entry);

  return {
    settings: clone(entry.settings),
    connection: sanitizeConnection(entry.connection)
  };
};

const saveCalendarConnection = async (userId, connection = {}) => {
  const entry = await getEntry(userId);
  const provider = connection.provider || 'google';

  entry.connection = {
    provider,
    email: connection.email || entry.connection.email || null,
    connectedAt: connection.connectedAt || new Date().toISOString(),
    status: connection.status || 'active',
    metadata: { ...entry.connection.metadata, ...connection.metadata },
    credentials: { ...entry.connection.credentials, ...connection.credentials }
  };

  if (provider) {
    entry.settings.integrationType = provider;
  }

  await saveEntry(userId, entry);

  return {
    settings: clone(entry.settings),
    connection: sanitizeConnection(entry.connection)
  };
};

const getCalendarCredentials = async (userId) => {
  const entry = await getEntry(userId);
  return entry.connection?.credentials;
};

module.exports = {
  DEFAULT_CALENDAR_SETTINGS,
  getCalendarSettings,
  updateCalendarSettings,
  saveCalendarConnection,
  getCalendarCredentials
};


