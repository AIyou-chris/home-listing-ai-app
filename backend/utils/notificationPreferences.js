const { supabaseAdmin } = require('../services/supabase');

const DEFAULT_NOTIFICATION_SETTINGS = {
  newLead: true,
  leadAction: true,
  appointmentScheduled: true,
  aiInteraction: false,
  weeklySummary: true,
  appointmentReminders: true,
  taskReminders: true,
  marketingUpdates: true,
  propertyInquiries: true,
  showingConfirmations: true,
  hotLeads: true,
  browserNotifications: true,
  weekendNotifications: false,
  weeklyReport: true,
  monthlyInsights: true,
  smsNewLeadAlerts: true,
  notificationPhone: '+15550000000',
  smsActiveHoursStart: '09:00',
  smsActiveHoursEnd: '17:00',
  priceChanges: false,
  contractMilestones: true,
  dailyDigest: true,
  securityAlerts: true,
  smsConsent: false,
  smsOptOutMsg: true,
  timeZone: 'America/New_York'
};

const demoStore = new Map();

const isUuid = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

const normalizeUserId = (userId) => {
  if (!userId || typeof userId !== 'string') return 'default-user';
  return userId.trim().toLowerCase();
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const getPreferences = async (userId) => {
  const normId = normalizeUserId(userId);

  if (!isUuid(normId)) {
    if (!demoStore.has(normId)) demoStore.set(normId, clone(DEFAULT_NOTIFICATION_SETTINGS));
    return demoStore.get(normId);
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('user_settings')
      .select('data')
      .eq('user_id', normId)
      .eq('category', 'notifications')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[NotificationPrefs] DB Fetch Error:', error.message);
    }

    if (data?.data) {
      return { ...DEFAULT_NOTIFICATION_SETTINGS, ...data.data };
    }
  } catch (err) {
    console.error('[NotificationPrefs] Unexpected error:', err);
  }

  return clone(DEFAULT_NOTIFICATION_SETTINGS);
};

const updatePreferences = async (userId, updates = {}) => {
  const current = await getPreferences(userId);
  const next = { ...current };

  Object.entries(updates).forEach(([key, value]) => {
    if (Object.hasOwn(DEFAULT_NOTIFICATION_SETTINGS, key)) {
      next[key] = value;
    }
  });

  const normId = normalizeUserId(userId);

  if (!isUuid(normId)) {
    demoStore.set(normId, next);
  } else {
    try {
      const { error } = await supabaseAdmin
        .from('user_settings')
        .upsert({
          user_id: normId,
          category: 'notifications',
          data: next,
          updated_at: new Date()
        }, { onConflict: 'user_id, category' });

      if (error) console.error('[NotificationPrefs] DB Save Error:', error.message);
    } catch (err) {
      console.error('[NotificationPrefs] Unexpected save error:', err);
    }
  }

  return next;
};

const shouldSend = async (userId, channel, eventKey) => {
  const settings = await getPreferences(userId);

  if (channel !== 'email') {
    return true;
  }

  if (!eventKey) {
    return true;
  }

  const normalizedKey = String(eventKey);
  if (Object.hasOwn(settings, normalizedKey)) {
    return Boolean(settings[normalizedKey]);
  }

  return true;
};

module.exports = {
  getPreferences,
  updatePreferences,
  shouldSend,
  DEFAULT_NOTIFICATION_SETTINGS
};



