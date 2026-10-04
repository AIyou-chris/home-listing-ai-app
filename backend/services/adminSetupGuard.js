'use strict';

// /api/admin/setup creates an admin account and is reachable without a login. It used to allow
// anyone in when the `admin_users` table was empty OR MISSING (the table does not exist in production,
// so the "an admin already exists" check never fired). It now fails closed: no ADMIN_SETUP_TOKEN
// configured means the route is off, and a wrong or missing token is refused.

const crypto = require('node:crypto');

function checkAdminSetupToken({ configuredToken, providedToken }) {
  const configured = String(configuredToken || '');
  if (!configured) return { allowed: false, reason: 'setup_disabled' };
  const provided = String(providedToken || '');
  const a = crypto.createHash('sha256').update(configured).digest();
  const b = crypto.createHash('sha256').update(provided).digest();
  if (!provided || !crypto.timingSafeEqual(a, b)) return { allowed: false, reason: 'invalid_setup_token' };
  return { allowed: true };
}

module.exports = { checkAdminSetupToken };
