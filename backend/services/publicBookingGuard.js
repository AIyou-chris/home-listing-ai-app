'use strict';

// A buyer can book a showing without logging in. That booking sends a confirmation email to
// the address the caller typed, so without limits anyone could use the endpoint to send mail
// from our domain. This module holds the limits and the field checks (no Express, no DB).

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const LIMITS = Object.freeze({
  perIpPerHour: 5,
  perEmailPerDay: 2,
  perListingPerDay: 40
});

const MAX_LEN = Object.freeze({ name: 80, notes: 500, location: 200, kind: 40, email: 254 });
const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/;

function createPublicBookingLimiter({ now = () => Date.now(), limits = LIMITS } = {}) {
  const buckets = new Map();

  const hit = (key, windowMs, max) => {
    const t = now();
    const recent = (buckets.get(key) || []).filter((ts) => ts > t - windowMs);
    if (recent.length >= max) {
      buckets.set(key, recent);
      return false;
    }
    recent.push(t);
    buckets.set(key, recent);
    return true;
  };

  // Count only after every check passes, so one blocked dimension does not burn the others.
  const wouldAllow = (key, windowMs, max) => {
    const t = now();
    return (buckets.get(key) || []).filter((ts) => ts > t - windowMs).length < max;
  };

  const sweep = () => {
    const t = now();
    for (const [key, list] of buckets) {
      if (!list.some((ts) => ts > t - DAY_MS)) buckets.delete(key);
    }
  };

  return {
    check({ ip, listingId, email }) {
      if (buckets.size > 5000) sweep();
      const ipKey = `ip:${ip || 'unknown'}`;
      const listingKey = `listing:${listingId || 'unknown'}`;
      const emailKey = email ? `email:${String(email).toLowerCase()}` : null;

      if (!wouldAllow(ipKey, HOUR_MS, limits.perIpPerHour)) return { allowed: false, retryAfterSeconds: 3600 };
      if (!wouldAllow(listingKey, DAY_MS, limits.perListingPerDay)) return { allowed: false, retryAfterSeconds: 3600 };
      if (emailKey && !wouldAllow(emailKey, DAY_MS, limits.perEmailPerDay)) return { allowed: false, retryAfterSeconds: 86400 };

      hit(ipKey, HOUR_MS, limits.perIpPerHour);
      hit(listingKey, DAY_MS, limits.perListingPerDay);
      if (emailKey) hit(emailKey, DAY_MS, limits.perEmailPerDay);
      return { allowed: true };
    }
  };
}

// Returns an error code, or null when the public booking fields are acceptable.
function validatePublicBookingFields({ name, email, notes, location, kind }) {
  const tooLong = (value, max) => typeof value === 'string' && value.length > max;
  if (tooLong(name, MAX_LEN.name)) return 'name_too_long';
  if (tooLong(notes, MAX_LEN.notes)) return 'notes_too_long';
  if (tooLong(location, MAX_LEN.location)) return 'location_too_long';
  if (tooLong(kind, MAX_LEN.kind)) return 'kind_too_long';
  if (email) {
    const value = String(email).trim();
    if (value.length > MAX_LEN.email || !EMAIL_RE.test(value)) return 'invalid_email';
  }
  return null;
}

module.exports = { createPublicBookingLimiter, validatePublicBookingFields, LIMITS, MAX_LEN };
