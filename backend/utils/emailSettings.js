const { supabaseAdmin } = require('../services/supabase');

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
};

const DEFAULT_CONNECTIONS = [];

const demoStore = new Map();

const isUuid = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

const normalizeUserId = (userId) => {
  if (!userId || typeof userId !== 'string') return 'default-user';
  return userId.trim().toLowerCase();
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const sanitizeConnections = (connections) =>
  connections.map(({ credentials, ...rest }) => ({ ...rest }));

const getEntry = async (userId) => {
  const normId = normalizeUserId(userId);

  if (!isUuid(normId)) {
    if (!demoStore.has(normId)) {
      demoStore.set(normId, {
        settings: clone(DEFAULT_EMAIL_SETTINGS),
        connections: clone(DEFAULT_CONNECTIONS)
      });
    }
    return demoStore.get(normId);
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('user_settings')
      .select('data')
      .eq('user_id', normId)
      .eq('category', 'email')
      .single();

    if (error && error.code !== 'PGRST116') console.error('[EmailSettings] DB Fetch Error:', error.message);

    if (data?.data) {
      return {
        settings: { ...DEFAULT_EMAIL_SETTINGS, ...(data.data.settings || {}) },
        connections: Array.isArray(data.data.connections) ? data.data.connections : clone(DEFAULT_CONNECTIONS)
      };
    }
  } catch (err) {
    console.error('[EmailSettings] Unexpected error:', err);
  }

  return {
    settings: clone(DEFAULT_EMAIL_SETTINGS),
    connections: clone(DEFAULT_CONNECTIONS)
  };
};

const saveEntry = async (userId, entry) => {
  const normId = normalizeUserId(userId);

  if (!isUuid(normId)) {
    demoStore.set(normId, entry);
  } else {
    try {
      const { error } = await supabaseAdmin
        .from('user_settings')
        .upsert({
          user_id: normId,
          category: 'email',
          data: entry,
          updated_at: new Date()
        }, { onConflict: 'user_id, category' });
      if (error) console.error('[EmailSettings] DB Save Error:', error.message);
    } catch (err) {
      console.error('[EmailSettings] Unexpected save error:', err);
    }
  }
};

const getEmailSettings = async (userId) => {
  const entry = await getEntry(userId);
  return {
    settings: clone(entry.settings),
    connections: sanitizeConnections(entry.connections)
  };
};

const updateEmailSettings = async (userId, updates = {}) => {
  const entry = await getEntry(userId);
  const allowedKeys = Object.keys(DEFAULT_EMAIL_SETTINGS);
  const nextSettings = { ...entry.settings };

  Object.entries(updates).forEach(([key, value]) => {
    if (allowedKeys.includes(key)) {
      nextSettings[key] = value;
    }
  });

  entry.settings = nextSettings;
  await saveEntry(userId, entry);

  return getEmailSettings(userId);
};

const connectEmailProvider = async (userId, provider, emailAddress, options = {}) => {
  const entry = await getEntry(userId);
  const now = new Date().toISOString();
  const fallbackEmail = emailAddress || entry.settings.fromEmail || `${normalizeUserId(userId)}@example.com`;
  const email = fallbackEmail.trim() || `${normalizeUserId(userId)}@example.com`;

  const connection = {
    provider,
    email,
    connectedAt: now,
    status: 'active',
    credentials: options.credentials ? { ...options.credentials } : undefined
  };

  const filtered = entry.connections.filter((item) => item.provider !== provider);
  entry.connections = [...filtered, connection];

  if (provider === 'gmail') {
    entry.settings.integrationType = 'oauth';
    entry.settings.fromEmail = email;
    if (!entry.settings.fromName) {
      entry.settings.fromName = email.split('@')[0];
    }
  }

  await saveEntry(userId, entry);

  return sanitizeConnections(entry.connections);
};

const disconnectEmailProvider = async (userId, provider) => {
  const entry = await getEntry(userId);
  entry.connections = entry.connections.filter((item) => item.provider !== provider);

  if (provider === 'gmail') {
    const stillConnected = entry.connections.some((item) => item.provider === 'gmail');
    if (!stillConnected) {
      entry.settings.integrationType = 'forwarding';
    }
  }

  await saveEntry(userId, entry);

  return sanitizeConnections(entry.connections);
};

module.exports = {
  DEFAULT_EMAIL_SETTINGS,
  getEmailSettings,
  updateEmailSettings,
  connectEmailProvider,
  disconnectEmailProvider
};
