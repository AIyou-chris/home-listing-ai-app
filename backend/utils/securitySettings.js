const { supabaseAdmin } = require('../services/supabase');

const DEFAULT_SECURITY_SETTINGS = {
  loginNotifications: true,
  sessionTimeout: 24,
  analyticsEnabled: true
};

const demoStore = new Map();

const isUuid = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

const normalizeUserId = (userId) => {
  if (!userId || typeof userId !== 'string') return 'default-user';
  return userId.trim().toLowerCase();
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const getEntry = async (userId) => {
  const normId = normalizeUserId(userId);

  if (!isUuid(normId)) {
    if (!demoStore.has(normId)) demoStore.set(normId, clone(DEFAULT_SECURITY_SETTINGS));
    return demoStore.get(normId);
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('user_settings')
      .select('data')
      .eq('user_id', normId)
      .eq('category', 'security')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[SecuritySettings] DB Fetch Error:', error.message);
    }

    if (data?.data) {
      return { ...DEFAULT_SECURITY_SETTINGS, ...(data.data || {}) };
    }
  } catch (err) {
    console.error('[SecuritySettings] Unexpected error:', err);
  }

  return clone(DEFAULT_SECURITY_SETTINGS);
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
          category: 'security',
          data: entry,
          updated_at: new Date()
        }, { onConflict: 'user_id, category' });
      if (error) console.error('[SecuritySettings] DB Save Error:', error.message);
    } catch (err) {
      console.error('[SecuritySettings] Unexpected save error:', err);
    }
  }
};

const getSecuritySettings = async (userId) => {
  const entry = await getEntry(userId);
  return clone(entry);
};

const updateSecuritySettings = async (userId, updates = {}) => {
  const entry = await getEntry(userId);
  const next = { ...entry };

  Object.entries(updates).forEach(([key, value]) => {
    if (Object.hasOwn(DEFAULT_SECURITY_SETTINGS, key)) {
      next[key] = value;
    }
  });

  await saveEntry(userId, next);
  return clone(next);
};

module.exports = {
  getSecuritySettings,
  updateSecuritySettings,
  DEFAULT_SECURITY_SETTINGS
};
