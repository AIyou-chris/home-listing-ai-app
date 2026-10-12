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
