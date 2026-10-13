'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { cleanFirstTouch, describe } = require('../services/signupSource');

test('keeps short plain strings and drops anything odd', () => {
  const out = cleanFirstTouch({ source: 'blog', medium: 'article', campaign: 'wow-link<script>', landing: '/blog/x', at: '2026-10-12T10:00:00Z' });
  assert.strictEqual(out.campaign, 'wow-linkscript');
  assert.strictEqual(describe(out), 'blog / article / wow-linkscript');
});

test('returns nothing when there is no source', () => {
  assert.strictEqual(cleanFirstTouch(null), null);
  assert.strictEqual(cleanFirstTouch({ medium: 'x' }), null);
  assert.strictEqual(describe(null), 'direct or unknown');
});

test('the blog call to action names the 7-day trial and sends the article as the source', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'blog', 'render.cjs'), 'utf8');
  assert.match(src, /Start my free 7-day trial/);
  assert.match(src, /utm_source=blog&utm_medium=article&utm_campaign=/);
});

test('article byline has an author link and machine-readable dates', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'blog', 'render.cjs'), 'utf8');
  assert.match(src, /rel="author"/);
  assert.match(src, /<time datetime=/);
});

test('the sitemap and blog feed come from the live blog routes, not the stale build copies', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'server.cjs'), 'utf8');
  assert.match(src, /req\.path === '\/sitemap\.xml' \|\| req\.path === '\/blog\/rss\.xml' \? next\(\)/);
});

test('sending a campaign to the blog creates a brief and runs the real blog writer, not a short stub', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'server.cjs'), 'utf8');
  const route = src.slice(src.indexOf("campaigns/:id/save-blog'"), src.indexOf('// GET /api/admin/social/status'));
  assert.match(route, /status: 'brief'/);
  assert.match(route, /blogService\.generate\(req\.user\.id, \{ id: saved\.post\.id \}\)/);
  assert.ok(!route.includes("status: 'draft'"), 'no more stub draft');
  assert.match(route, /admin_marketing_images/);
});

test('the blog title sent from a campaign stays short enough for the blog rules', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'server.cjs'), 'utf8');
  const route = src.slice(src.indexOf("campaigns/:id/save-blog'"), src.indexOf('// GET /api/admin/social/status'));
  assert.ok(!/join\(' — '\)/.test(route), 'idea must not be glued into the title');
  assert.match(route, /title\.length > 110/);
});

test('the blog save turns comma-separated keyword strings into lists before writing', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'blog', 'service.cjs'), 'utf8');
  assert.match(src, /for\(const key of \['seo_keywords','related_slugs','planned_links'\]\)if\(typeof patch\[key\]==='string'\)/);
});
