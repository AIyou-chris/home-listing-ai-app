'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// Every table that belongs to one customer. A query on any of them must name owner_id, or two customers could see each other's rows.
const OWNED = ['admin_marketing_campaigns', 'admin_marketing_posts', 'admin_marketing_media', 'admin_switches', 'house_social_connections', 'house_social_oauth_states',
  'admin_fb_groups', 'admin_fb_group_posts', 'cold_email_prospects', 'cold_email_batches', 'cold_email_sends', 'cold_email_replies', 'blog_posts'];
// Reads that are public or look rows up by their own unguessable id on purpose, each with the reason.
const ALLOWED = {
  'services/marketingImages/blog.cjs': 'public picture link: only pictures used by a PUBLISHED article are served',
  'services/adminSwitches.js': 'ownersWithSwitchOn lists every customer who has a switch ON, for the background jobs'
};

const ENGINE = path.join(__dirname, '..');
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '__tests__' || e.name === 'tools') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out); else if (/\.(js|cjs)$/.test(e.name)) out.push(full);
  }
  return out;
};

test('every query on a customer-owned table names owner_id (or is a listed exception)', () => {
  const loose = [];
  for (const file of walk(ENGINE)) {
    const rel = path.relative(ENGINE, file);
    if (ALLOWED[rel]) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(/\.from\(\s*['"]([a-z_]+)['"]\s*\)/g)) {
      if (!OWNED.includes(m[1])) continue;
      const rest = text.slice(m.index, m.index + 700);
      const stop = rest.search(/;\s*\n|\n\s*\n/);
      const statement = stop > 0 ? rest.slice(0, stop) : rest;
      // A query by the row's own id after the row was already fetched for this owner is fine when the same function also names owner_id nearby.
      const around = text.slice(Math.max(0, m.index - 900), m.index + 900);
      if (!/owner_id|owner\b/.test(statement) && !/owner_id/.test(around)) loose.push(`${rel}: ${text.slice(0, m.index).split('\n').length} (${m[1]})`);
    }
  }
  assert.deepStrictEqual(loose, [], `queries without an owner: ${loose.join(', ')}`);
});

test('every listed exception still exists', () => {
  for (const rel of Object.keys(ALLOWED)) assert.ok(fs.existsSync(path.join(ENGINE, rel)), rel);
});
