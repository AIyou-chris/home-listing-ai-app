'use strict';
// Reads the ONE settings file for this business (business.json, or the file named in BUSINESS_CONFIG_PATH).
// Name, site, prices, approved facts, topics and the posting calendar live there, not in the code.
// A copy of this app for another customer only needs its own business.json.
const fs = require('fs');
const path = require('path');

const REQUIRED = ['name', 'siteUrl', 'alertEmail', 'prices', 'schedule', 'links', 'rules', 'facts', 'topics', 'launch', 'look'];

function validate(cfg) {
  const missing = REQUIRED.filter((k) => cfg[k] === undefined);
  if (missing.length) throw new Error(`business settings missing: ${missing.join(', ')}`);
  if (!/^https:\/\//.test(cfg.siteUrl)) throw new Error('business settings: siteUrl must start with https://');
  if (!Array.isArray(cfg.schedule.slots) || !cfg.schedule.slots.length) throw new Error('business settings: schedule.slots needs at least one time');
  for (const s of cfg.schedule.slots) if (!(s.h >= 0 && s.h < 24 && s.m >= 0 && s.m < 60)) throw new Error('business settings: a slot time is not a real time');
  if (!Array.isArray(cfg.prices.allowed)) throw new Error('business settings: prices.allowed must be a list');
  for (const k of ['palette', 'wordmark', 'writerPersona', 'writerMetaphors', 'sceneTopics', 'director', 'lighting', 'negative', 'editorialStyle', 'launchLook', 'brightLook', 'extraRules', 'fallbackScenes']) if (!cfg.look[k]) throw new Error(`business settings: look.${k} is missing`);
  if (!Array.isArray(cfg.look.fallbackScenes) || !cfg.look.fallbackScenes.length) throw new Error('business settings: look.fallbackScenes needs at least one scene');
  const auto = cfg.video?.autoScene;
  if (auto?.enabled) {
    const scenes = Object.keys(cfg.video.scenes || {});
    if (!scenes.includes(auto.fallback)) throw new Error('business settings: video.autoScene.fallback is not one of the video scenes');
    for (const r of auto.rules || []) {
      if (!scenes.includes(r.scene)) throw new Error(`business settings: video.autoScene rule names a scene that does not exist (${r.scene})`);
      try { new RegExp(r.pattern, 'i'); } catch { throw new Error(`business settings: video.autoScene pattern is not valid (${r.pattern})`); }
    }
  }
  const keys = new Set();
  for (const t of [...cfg.topics, ...cfg.launch]) {
    if (!t.key || !t.idea) throw new Error('business settings: every topic needs a key and an idea');
    if (keys.has(t.key)) throw new Error(`business settings: topic key used twice (${t.key})`);
    keys.add(t.key);
    for (const f of t.facts || []) if (!cfg.facts[f]) throw new Error(`business settings: topic ${t.key} uses a fact that is not listed (${f})`);
  }
  return cfg;
}

function load(file = process.env.BUSINESS_CONFIG_PATH || path.join(__dirname, 'business.json')) {
  return validate(JSON.parse(fs.readFileSync(file, 'utf8')));
}

const absolute = (cfg, p) => (p && p.startsWith('/') ? `${cfg.siteUrl}${p}` : p);
const hostPattern = (cfg) => new RegExp(`^https?:\\/\\/(?:www\\.)?${new URL(cfg.siteUrl).host.replace(/^www\./, '').replace(/\./g, '\\.')}(?:[/?#]|$)`, 'i');

module.exports = { load, validate, absolute, hostPattern, business: load() };
