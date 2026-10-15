'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { buildAnalytics } = require('../services/marketingAnalytics');

const fakeDb = (tables) => ({
  from: (name) => {
    let rows = tables[name];
    const q = { select: () => q, gte: () => q, limit: () => q, then: (ok) => ok(rows instanceof Error ? { data: null, error: rows } : { data: rows || [], error: null }) };
    return q;
  }
});

test('counts posts, tagged signups and blog events, and says when it is too early', async () => {
  const out = await buildAnalytics({ db: fakeDb({
    admin_marketing_posts: [{ channel: 'linkedin', status: 'published' }, { channel: 'linkedin', status: 'failed' }, { channel: 'facebook', status: 'published' }],
    agents: [{ id: 1, metadata: { signup_source: { source: 'linkedin', campaign: 'abcd1234' } } }, { id: 2, metadata: {} }],
    admin_marketing_campaigns: [{ id: 'abcd1234-0000', outputs: { title: 'Referral post' } }],
    leads: [{ source_type: 'blog' }, { source_type: 'blog' }],
    blog_events: [{ slug: 'a', event: 'article_view' }, { slug: 'a', event: 'cta_click' }],
    cold_email_sends: []
  }), days: 30 });
  assert.equal(out.posts.published, 2);
  assert.equal(out.posts.failed, 1);
  assert.equal(out.signups.tagged, 1);
  assert.equal(out.signups.bySource[0].source, 'linkedin');
  assert.equal(out.signups.byCampaign[0].title, 'Referral post');
  assert.equal(out.leads.bySource[0].count, 2);
  assert.equal(out.blog.ctaClicks, 1);
  assert.ok(out.verdicts.some((v) => /failed/.test(v)));
});
test('one broken table does not break the page', async () => {
  const out = await buildAnalytics({ db: fakeDb({ admin_marketing_posts: new Error('boom') }) });
  assert.ok(out.notes.some((n) => /Posts/.test(n)));
  assert.equal(out.posts.published, 0);
});
