'use strict';
// The marketing engine as a paid add-on. When business.json says `addon.required: true`, a customer only gets the
// marketing screens and background jobs after the switch `marketing_addon` is turned ON for them. Missing = OFF.
// When `required` is false (the business's own copy) everybody who can log in to the admin has it.
const { getSwitch, setSwitch, ownersWithSwitchOn } = require('./adminSwitches');
const { business } = require('../config/business');

const KEY = 'marketing_addon';
const required = (cfg = business) => cfg.addon?.required === true;

async function isEntitled(db, owner, cfg = business) {
  if (!required(cfg)) return true;
  return getSwitch(db, KEY, owner);
}
async function entitledOwners(db, owners, cfg = business) {
  if (!required(cfg)) return owners;
  const on = new Set(await ownersWithSwitchOn(db, KEY));
  return owners.filter((o) => on.has(o));
}
const setEntitled = (db, owner, enabled, by) => setSwitch(db, KEY, enabled === true, by || owner, owner);

// Runs right after the login guard. 402 = "this account has not bought the add-on".
function addonGuard(db, cfg = business) {
  return async (req, res, next) => {
    try {
      if (await isEntitled(db, req.user?.id, cfg)) return next();
      return res.status(402).json({ error: 'The marketing add-on is not turned on for this account.', code: 'ADDON_OFF' });
    } catch { return res.status(402).json({ error: 'The marketing add-on is not turned on for this account.', code: 'ADDON_OFF' }); }
  };
}

// An app whose routes that use the login guard also run the add-on guard right after it.
function withAddonGuard(app, verifyAdmin, db, cfg = business) {
  const guard = addonGuard(db, cfg);
  const wrap = (method) => (path, ...handlers) => app[method](path, ...handlers.flatMap((h) => (h === verifyAdmin ? [verifyAdmin, guard] : [h])));
  return { get: wrap('get'), post: wrap('post'), put: wrap('put'), patch: wrap('patch'), delete: wrap('delete'), use: (...a) => app.use(...a) };
}

module.exports = { KEY, isEntitled, entitledOwners, setEntitled, addonGuard, withAddonGuard };
