const { supabaseAdmin } = require('../services/supabase');

const DEFAULT_BILLING_SETTINGS = {
  planName: 'Complete AI Solution',
  planStatus: 'active',
  amount: 49,
  currency: 'USD',
  managedBy: 'paypal',
  renewalDate: null,
  cancellationRequestedAt: null,
  history: [
    {
      id: 'inv-0001',
      date: '2024-07-15',
      amount: 49,
      status: 'Paid',
      description: 'Complete AI Solution - Monthly',
      invoiceUrl: null
    }
  ]
};

const demoStore = new Map();

const isUuid = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

const normalizeUserId = (userId) => {
  if (!userId || typeof userId !== 'string') return 'default-user';
  const trimmed = userId.trim().toLowerCase();
  if (trimmed.startsWith('blueprint-') || trimmed === 'guest-agent') return 'demo-blueprint';
  return trimmed;
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const sanitizeHistory = (history) => {
  if (!Array.isArray(history)) return clone(DEFAULT_BILLING_SETTINGS.history);

  return history
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      id: String(entry.id || `inv-${Date.now()}`),
      date: typeof entry.date === 'string' ? entry.date : new Date().toISOString().slice(0, 10),
      amount: typeof entry.amount === 'number' ? entry.amount : Number(entry.amount) || 0,
      status: ['Paid', 'Pending', 'Failed'].includes(entry.status) ? entry.status : 'Paid',
      description: typeof entry.description === 'string' ? entry.description : undefined,
      invoiceUrl: typeof entry.invoiceUrl === 'string' ? entry.invoiceUrl : null
    }));
};

const getEntry = async (userId) => {
  const normId = normalizeUserId(userId);

  if (!isUuid(normId)) {
    if (!demoStore.has(normId)) demoStore.set(normId, clone(DEFAULT_BILLING_SETTINGS));
    return demoStore.get(normId);
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('user_settings')
      .select('data')
      .eq('user_id', normId)
      .eq('category', 'billing')
      .single();

    if (error && error.code !== 'PGRST116') console.error('[BillingSettings] DB Fetch Error:', error.message);

    if (data?.data) {
      return {
        ...clone(DEFAULT_BILLING_SETTINGS),
        ...data.data,
        history: sanitizeHistory(data.data.history || DEFAULT_BILLING_SETTINGS.history)
      };
    }
  } catch (err) {
    console.error('[BillingSettings] Unexpected error:', err);
  }

  return clone(DEFAULT_BILLING_SETTINGS);
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
          category: 'billing',
          data: entry,
          updated_at: new Date()
        }, { onConflict: 'user_id, category' });
      if (error) console.error('[BillingSettings] DB Save Error:', error.message);
    } catch (err) {
      console.error('[BillingSettings] Unexpected save error:', err);
    }
  }
};

const getBillingSettings = async (userId) => {
  const entry = await getEntry(userId);
  // Ensure history exists
  if (!entry.history) entry.history = clone(DEFAULT_BILLING_SETTINGS.history);

  return { settings: entry };
};

const updateBillingSettings = async (userId, updates = {}) => {
  const entry = await getEntry(userId);
  const next = { ...entry, ...updates };

  if (updates.history) {
    next.history = sanitizeHistory(updates.history);
  }

  await saveEntry(userId, next);

  return { settings: next };
};

module.exports = {
  DEFAULT_BILLING_SETTINGS,
  getBillingSettings,
  updateBillingSettings
};

