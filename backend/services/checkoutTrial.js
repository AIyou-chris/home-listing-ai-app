'use strict';

// LO signups get a 7-day trial with no card. When they later go to Stripe Checkout, the
// Stripe trial must only cover the days they have LEFT of that first week, otherwise someone
// whose trial already ended gets another free week (and someone on day 3 gets 10 days).
// Stripe's trial_period_days must be a whole number >= 1, or 0/undefined for no trial.

const TRIAL_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

function checkoutTrialDays({ createdAt, now = Date.now(), payNow = false } = {}) {
  if (payNow) return 0;
  if (createdAt === null || createdAt === undefined || createdAt === '') return TRIAL_DAYS;
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return TRIAL_DAYS; // unknown signup date: be generous, not blocking
  const remaining = Math.ceil((created + TRIAL_DAYS * DAY_MS - now) / DAY_MS);
  return remaining > 0 ? Math.min(remaining, TRIAL_DAYS) : 0;
}

module.exports = { checkoutTrialDays, TRIAL_DAYS };
