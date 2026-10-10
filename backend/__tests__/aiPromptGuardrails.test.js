'use strict';
// Every AI that talks to a buyer, a lead or the public, or writes listing copy, must carry the Golden Rules
// (no rate promises, Fair Housing, no guessing). This was missing on the SMS auto-reply, the agent page chat,
// the WOW page property chat and both listing-description writers (found in the 2026-10-08 launch audit).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'server.cjs'), 'utf8');

const mustCarryRules = [
  ['SMS auto-reply', 'const systemPrompt = `${require(\'./services/goldenRules\').GOLDEN_RULES_PROMPT}\n\nYou are ${agentName'],
  ['WOW page property chat', 'const systemPrompt = `${require(\'./services/goldenRules\').GOLDEN_RULES_PROMPT}\n\nYou are an expert real estate assistant'],
  ['agent page chat', 'const systemPrompt = `${require(\'./services/goldenRules\').GOLDEN_RULES_PROMPT}\n\nYou are the AI Assistant for'],
  ['listing description writer', "role: 'system', content: require('./services/goldenRules').GOLDEN_RULES_PROMPT }, { role: 'user', content: prompt }"],
  ['generate-listing writer', "content: require('./services/goldenRules').GOLDEN_RULES_PROMPT + \"\\n\\nYou are an expert real estate copywriter.\""]
];

for (const [name, marker] of mustCarryRules) {
  test(`${name} carries the Golden Rules`, () => {
    assert.ok(src.includes(marker), `${name} lost its Golden Rules prompt`);
  });
}

test('the open blueprint leads dump is gone', () => {
  assert.ok(!src.includes('/api/blueprint/leads'));
});

test('a full lead cap never turns a buyer away at lead capture', () => {
  const at = src.indexOf("feature: 'stored_leads_cap'");
  assert.ok(at > 0);
  const block = src.slice(at, at + 1400);
  assert.ok(!/status\(403\)\.json\(buildLimitReachedPayload\(leadCapEntitlement/.test(block), 'lead capture must not 403 on the cap');
});

test('no agents lookup asks for the column agents.user_id (it does not exist; the query fails and returns nothing)', () => {
  const lines = src.split('\n');
  const bad = [];
  lines.forEach((line, i) => {
    if (/select\('(user_id,auth_user_id|id, auth_user_id, user_id, first_name)/.test(line)) bad.push(i + 1);
  });
  assert.deepStrictEqual(bad, []);
  assert.ok(!src.includes('auth_user_id.eq.${agentId},user_id.eq.${agentId}'));
});

test('a weak password at invite claim gets a plain message, not a generic failure', () => {
  assert.ok(src.includes('const isWeakPasswordError'));
  assert.ok((src.match(/password_too_weak/g) || []).length >= 2);
  assert.ok(/isWeakPasswordError\(/.test(src));
  const fe = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'pages', 'AgentClaimPage.tsx'), 'utf8');
  assert.ok(fe.includes('password_too_weak'));
});

test('chat messages go through the translator so the database check rules accept them', () => {
  assert.ok(src.includes("table === 'ai_conversation_messages' ? dbMsg.normalizeMessagePayload(payload)"));
  // no raw insert into the messages table (it would skip the translator); the inbound-email one already uses allowed words
  const raw = src.match(/from\('ai_conversation_messages'\)\s*\.insert\(/g) || [];
  assert.ok(raw.length <= 2, `raw inserts into ai_conversation_messages: ${raw.length}`);
  assert.ok(!/from\('ai_conversation_messages'\)\.insert\(/.test(src));
});

test('the buyer chat is given the listing description and what the agent taught the home', () => {
  const at = src.indexOf('const buildListingContext');
  const block = src.slice(at, at + 5200);
  assert.ok(block.includes('agent_provided_facts'));
  assert.ok(/description:\s*pickText/.test(block));
});

test('publishing checks the partner loan officer plan before the agent own Free plan', () => {
  const at = src.indexOf("app.patch('/api/dashboard/listings/:listingId/publish'");
  const block = src.slice(at, at + 3200);
  assert.ok(block.includes('partnerNetworkPublishDecision'));
  assert.ok(block.indexOf('partnerNetworkPublishDecision') < block.indexOf("feature: 'active_listings'"));
});

test('public pages, SEO text and the sales bot do not state customer results we cannot prove', () => {
  const root = path.join(__dirname, '..', '..');
  const files = ['index.html', 'public/llms.txt', 'public/ai.txt', 'scripts/generate-seo-pages.mjs', 'src/services/helpSalesChatBot.ts'];
  const banned = [/most LOs (see|recoup)/i, /average LO commission/i, /becomes a warm lead routed back to the loan officer in real time/i, /\bpre-?qualified (mortgage |buyer )?leads/i, /unlimited/i];
  const hits = [];
  for (const f of files) {
    const text = fs.readFileSync(path.join(root, f), 'utf8');
    for (const re of banned) if (re.test(text)) hits.push(`${f}: ${re}`);
  }
  assert.deepStrictEqual(hits, []);
});

test('the Textbelt reply webhook checks its signature and only acts on a STOP when it cannot', () => {
  assert.ok(src.includes('verifyTextbeltWebhook({ headers: req.headers, rawBody: req.rawBody'));
  assert.ok(src.includes("reason: 'unverified_sender'"));
  assert.ok(src.includes('isStopMessage(textBody)'));
});

test('a STOP reply marks the lead with the status word the database accepts', () => {
  assert.ok(src.includes("{ status: 'Unsubscribed', updated_at: nowIso() }"));
  assert.ok(!src.includes(".update({ status: 'unsubscribed', last_contact_at"));
});

test('the reel route checks the video tool is installed before paying for a voiceover', () => {
  const at = src.indexOf("app.post('/api/lo/listings/:listingId/reel'");
  const block = src.slice(at, at + 1500);
  assert.ok(block.includes('await reels.available()'));
});

test('phone greeting: custom text is used and the recording notice is always kept', () => {
  const { createLoPhoneCallService } = require('../services/loPhoneCallService');
  const svc = createLoPhoneCallService({ supabase: {}, fetchImpl: async () => ({ ok: true }), log: console });
  const lo = { first_name: 'Chris' };
  const custom = svc.openingLine({ config: { bot_name: 'Sky', phone_greeting: 'Hey, {ai_name} here for {lo_name}!' }, lo });
  assert.match(custom, /Sky here for Chris/);
  assert.match(custom, /transcribed/);
  const kept = svc.openingLine({ config: { bot_name: 'Sky', phone_greeting: 'Hi! This call is recorded.' }, lo });
  assert.doesNotMatch(kept, /transcribed/);
  assert.match(svc.openingLine({ config: { bot_name: 'Sky' }, lo }), /Thanks for calling|thanks for calling/);
});
