'use strict';

// Codes that grant free access (friends and family, lifetime comps) come ONLY from the
// FREE_ACCESS_PROMO_CODES environment variable (comma separated). Nothing is built in:
// the old hardcoded "LIFETIME" / "FRIENDS30" were in the repo and in the UI placeholder,
// so anyone could have used them to get the product for free.

function freeAccessCodes(env = process.env) {
  return new Set(
    String(env.FREE_ACCESS_PROMO_CODES || '')
      .split(',')
      .map((code) => code.trim().toUpperCase())
      .filter(Boolean)
  );
}

function isFreeAccessCode(code, env = process.env) {
  const normalized = String(code || '').trim().toUpperCase();
  return normalized.length > 0 && freeAccessCodes(env).has(normalized);
}

module.exports = { freeAccessCodes, isFreeAccessCode };
