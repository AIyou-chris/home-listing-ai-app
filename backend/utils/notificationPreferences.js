const { supabaseAdmin } = require('../services/supabase');
const SMS_COMING_SOON =
  String(process.env.SMS_COMING_SOON || 'true').toLowerCase() !== 'false';

const DEFAULT_NOTIFICATION_SETTINGS = {
  email_enabled: true,
  voice_enabled: true,
  sms_enabled: false,
  newLead: true,
  leadAction: true,
  appointmentScheduled: true,
  aiInteraction: false,
  weeklySummary: true,
  appointmentReminders: true,
  voiceAppointmentReminders: true,
  taskReminders: true,
  marketingUpdates: true,
  propertyInquiries: true,
  showingConfirmations: true,
  hotLeads: true,
  browserNotifications: true,
  weekendNotifications: false,
  weeklyReport: true,
  monthlyInsights: true,
  smsNewLeadAlerts: false,
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
      if (SMS_COMING_SOON && (key === 'smsNewLeadAlerts' || key === 'sms_enabled')) {
        next[key] = false;
        return;
      }
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

  // 1. CHANNEL TOGGLE CHECK
  if (eventKey && Object.hasOwn(settings, eventKey)) {
    // Audit Bridge: UI uses 'leadAction', Backend often uses 'aiInteraction'
    // We check both to ensure the UI toggle actually works.
    if (!settings[eventKey]) return false;
    if (eventKey === 'aiInteraction' && Object.hasOwn(settings, 'leadAction')) {
      if (!settings.leadAction) return false;
    }
  }

  // 2. CHANNEL-SPECIFIC RULES
  if (channel === 'email' && settings.email_enabled === false) {
    return false;
  }

  if (channel === 'voice' && settings.voice_enabled === false) {
    return false;
  }

  if (channel === 'sms') {
    if (settings.sms_enabled === false) {
      return false;
    }

    if (SMS_COMING_SOON) {
      console.log(`📵 [Notifications] SMS disabled (coming soon) for User ${userId}`);
      return false;
    }

    // Check SMS Consent
    if (!settings.smsConsent) {
      console.warn(`🛑 [Notifications] Blocked SMS to User ${userId}: No SMS Consent.`);
      return false;
    }

    // Check Quiet Hours
    const now = new Date();
    // Simple timezone conversion if timezone is set (e.g. "America/New_York")
    let localTimeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

    if (settings.timeZone) {
      try {
        localTimeStr = now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          timeZone: settings.timeZone
        });
      } catch (e) {
        console.warn(`⚠️ [Notifications] Invalid timezone ${settings.timeZone}. Using server time.`);
      }
    }

    const start = settings.smsActiveHoursStart || '09:00';
    const end = settings.smsActiveHoursEnd || '17:00';

    let isWithin = false;
    if (start <= end) {
      isWithin = localTimeStr >= start && localTimeStr <= end;
    } else {
      isWithin = localTimeStr >= start || localTimeStr <= end;
    }

    if (!isWithin) {
      console.log(`🔕 [Notifications] SMS Blocked: ${localTimeStr} is outside active hours (${start}-${end}) for User ${userId}`);
      return false;
    }
  }

  return true;
};

module.exports = {
  getPreferences,
  updatePreferences,
  shouldSend,
  DEFAULT_NOTIFICATION_SETTINGS
};

