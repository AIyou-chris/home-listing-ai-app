const DEFAULT_SECURITY_SETTINGS = {
  loginNotifications: true,
  sessionTimeout: 24,
  analyticsEnabled: true
};

const store = new Map();

const sanitizeUserId = (userId) => {
  if (!userId || typeof userId !== 'string') {
    return 'default-user';
  }
  return userId.trim().toLowerCase();
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const getSecuritySettings = (userId) => {
  const key = sanitizeUserId(userId);
  if (!store.has(key)) {
    store.set(key, clone(DEFAULT_SECURITY_SETTINGS));
  }
  return clone(store.get(key));
};

const updateSecuritySettings = (userId, updates = {}) => {
  const current = getSecuritySettings(userId);
  const next = { ...current };
  Object.entries(updates).forEach(([key, value]) => {
    if (Object.hasOwn(current, key)) {
      next[key] = value;
    }
  });
  const key = sanitizeUserId(userId);
  store.set(key, clone(next));
  return clone(next);
};

module.exports = {
  getSecuritySettings,
  updateSecuritySettings,
  DEFAULT_SECURITY_SETTINGS
};
