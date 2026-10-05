const test = require('node:test');
const assert = require('node:assert');
const rules = require('../services/coldEmail/rules');
const seq = require('../services/coldEmail/sequence');
const { classifyReply, draftReply } = require('../services/coldEmail/replyClassifier');
const { appendFooter, listUnsubscribeHeaders } = require('../services/coldEmail/compliance');
const templates = require('../services/coldEmail/templates');
const examples = require('../services/coldEmail/examples');
const writer = require('../services/coldEmail/writer');

const GOOD = 'Hi Sam,\n\nMost loan officers I talk to say agents send fewer referrals than before, and the internet leads they buy do not pick up.\n\nI built a listing page with an AI chat and your name on it, so buyers who ask about a house become a warm lead routed straight to you. The agent gets a better listing page. You get the call.\n\nWorth a 2-minute look?\n\nChris\nFounder, HomeListingAI';
const base = (over = {}) => ({ touch: 1, subject: 'your agent partners', body: GOOD, replyOnly: true, ...over });
const failedRules = (over) => rules.checkColdEmail(base(over)).failures.map((f) => f.rule);

test('a good first email passes', () => {
  assert.deepStrictEqual(rules.checkColdEmail(base()).failures, []);
});

test('length is enforced per touch', () => {
  assert.ok(failedRules({ body: 'Hi Sam,\n\nShort one. Worth a look?\n\nChris\nFounder, HomeListingAI' }).includes('length'));
  assert.ok(failedRules({ body: `${GOOD}\n\n${'word '.repeat(80)}` }).includes('length'));
});

test('subject rules', () => {
  assert.ok(failedRules({ subject: 'hi' }).includes('subject_length'));
  assert.ok(failedRules({ subject: 'one two three four five six seven' }).includes('subject_length'));
  assert.ok(failedRules({ subject: 'big news 🚀 today' }).includes('subject_emoji'));
  assert.ok(failedRules({ subject: 'Act now friend' }).includes('subject_clickbait'));
  assert.ok(failedRules({ subject: 'Re: your agents' }).includes('subject_clickbait'));
  assert.ok(failedRules({ subject: 'GREAT OFFER inside' }).includes('subject_caps'));
  assert.ok(failedRules({ subject: 'your agents!' }).includes('subject_bang'));
});

test('banned words and promise wording are blocked', () => {
  assert.ok(failedRules({ body: GOOD.replace('Worth a 2-minute look?', 'Our seamless solution will leverage your pipeline.') }).includes('banned_word'));
  assert.ok(failedRules({ body: GOOD.replace('You get the call.', 'Get approved for the lowest rates.') }).includes('promise'));
  assert.ok(failedRules({ body: GOOD.replace('You get the call.', 'We pay you a referral fee.') }).includes('promise'));
  assert.ok(failedRules({ body: GOOD.replace('You get the call.', 'Loan officers like you love it.') }).includes('fake_proof'));
});

test('invented numbers and percentages are blocked, approved ones pass', () => {
  assert.ok(failedRules({ body: GOOD.replace('You get the call.', 'Our users close 43% more.') }).includes('numbers'));
  assert.ok(failedRules({ body: GOOD.replace('You get the call.', 'Over 1,200 loan officers use it.') }).includes('numbers'));
  assert.deepStrictEqual(rules.unapprovedNumbers('The LO plan is $149 and the trial is 7 days. We answer at 9pm.'), []);
});

test('links: at most one, none on a reply-only first touch, required on touch 2', () => {
  const link = 'https://homelistingai.com/partner-invite/demo';
  assert.ok(failedRules({ body: GOOD.replace('Worth a 2-minute look?', `See ${link} and ${link}2`) }).includes('links'));
  assert.ok(failedRules({ body: GOOD.replace('Worth a 2-minute look?', `See ${link}`) }).includes('links'));
  assert.ok(!failedRules({ body: GOOD.replace('Worth a 2-minute look?', `See ${link}`), replyOnly: false }).includes('links'));
  const t2 = rules.checkColdEmail({ touch: 2, subject: 'a live example', body: templates.fill(templates.touch2.body, { first_name: 'Sam' }), allowPlaceholders: true });
  assert.ok(t2.failures.some((f) => f.rule === 'links'));
});

test('no html, markdown, shouting, extra exclamation marks', () => {
  assert.ok(failedRules({ body: GOOD.replace('Worth', '<b>Worth</b>') }).includes('html'));
  assert.ok(failedRules({ body: GOOD.replace('Worth a 2-minute look?', '- Worth a look?') }).includes('formatting'));
  assert.ok(failedRules({ body: GOOD.replace('You get the call.', 'This is HUGE for you.') }).includes('all_caps'));
  assert.ok(failedRules({ body: GOOD.replace('You get the call.', 'You get the call! Really!') }).includes('exclamation'));
});

test('unfilled placeholders block a real send but not an example', () => {
  assert.ok(failedRules({ body: GOOD.replace('Hi Sam', 'Hi {{first_name}}') }).includes('placeholder'));
  assert.ok(!rules.checkColdEmail(base({ body: GOOD.replace('Hi Sam', 'Hi {{first_name}}'), allowPlaceholders: true })).failures.some((f) => f.rule === 'placeholder'));
});

test('signature is required', () => {
  assert.ok(failedRules({ body: GOOD.replace('\n\nChris\nFounder, HomeListingAI', '') }).includes('signature'));
});

test('footer must carry the address and an unsubscribe link', () => {
  const full = appendFooter(GOOD, { unsubscribeUrl: 'https://x.test/u/abc', address: '1 Main St' });
  assert.deepStrictEqual(rules.checkFooter(full, { postalAddress: '1 Main St' }), []);
  assert.strictEqual(rules.checkFooter(GOOD, { postalAddress: '1 Main St' }).length, 2);
  const h = listUnsubscribeHeaders({ unsubscribeUrl: 'https://x.test/u/abc', mailto: 'u@x.test' });
  assert.match(h['List-Unsubscribe'], /<https:\/\/x\.test\/u\/abc>/);
  assert.strictEqual(h['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
});

test('recipient checks: syntax, role, suppression, 30-day rule, MX', async () => {
  const supp = new Set(['gone@x.com']);
  const mx = async (d) => d !== 'nomail.test';
  const run = (o) => rules.checkRecipient({ suppressed: supp, mxLookup: mx, ...o });
  assert.strictEqual((await run({ email: 'sam@x.com' })).ok, true);
  assert.ok((await run({ email: 'nope' })).failures.some((f) => f.rule === 'syntax'));
  assert.ok((await run({ email: 'info@x.com' })).failures.some((f) => f.rule === 'role'));
  assert.ok((await run({ email: 'gone@x.com' })).failures.some((f) => f.rule === 'suppressed'));
  assert.ok((await run({ email: 'sam@x.com', lastContactedAt: new Date(Date.now() - 5 * 86400000).toISOString() })).failures.some((f) => f.rule === 'recent'));
  assert.ok((await run({ email: 'sam@nomail.test' })).failures.some((f) => f.rule === 'mx'));
});

test('send windows: Tue-Thu mornings, recipient local time, no holidays', () => {
  const tz = 'America/Chicago';
  assert.strictEqual(seq.inSendWindow(new Date('2026-10-06T12:45:00Z'), { timeZone: tz }), true); // Tue 7:45 CDT
  assert.strictEqual(seq.inSendWindow(new Date('2026-10-05T12:45:00Z'), { timeZone: tz }), false); // Monday
  assert.strictEqual(seq.inSendWindow(new Date('2026-10-06T16:45:00Z'), { timeZone: tz }), false); // 11:45
  assert.strictEqual(seq.inSendWindow(new Date('2026-10-06T21:00:00Z'), { timeZone: tz, window: 'afternoon' }), true);
  assert.strictEqual(seq.inSendWindow(new Date('2026-11-26T13:00:00Z'), { timeZone: tz }), false); // Thanksgiving
  assert.strictEqual(seq.isUsHoliday(2026, 7, 4), true);
  assert.strictEqual(seq.tzForState('wa'), 'America/Los_Angeles');
});

test('the 5-touch schedule keeps its spacing and lands only in windows', () => {
  const dates = seq.scheduleSequence(new Date('2026-10-05T18:00:00Z'), { timeZone: 'America/Chicago' });
  assert.strictEqual(dates.length, 5);
  dates.forEach((d) => assert.strictEqual(seq.inSendWindow(d, { timeZone: 'America/Chicago' }), true));
  for (let i = 1; i < 5; i += 1) assert.ok(dates[i] - dates[i - 1] >= 2 * 86400000 - 3600000);
});

test('warm-up caps and auto-pause', () => {
  assert.strictEqual(seq.dailyCapForMailbox({ firstSendAt: null }), 20);
  const start = '2026-01-01T00:00:00Z';
  assert.strictEqual(seq.dailyCapForMailbox({ firstSendAt: start, now: new Date('2026-01-09T00:00:00Z').getTime() }), 32);
  assert.strictEqual(seq.dailyCapForMailbox({ firstSendAt: start, now: new Date('2027-01-01T00:00:00Z').getTime(), max: 200 }), 75);
  assert.strictEqual(seq.dailyCapForMailbox({ firstSendAt: start, now: new Date('2027-01-01T00:00:00Z').getTime(), max: 10 }), 50);
  assert.strictEqual(seq.shouldPause({ sent: 100, bounced: 2, complained: 0 }).pause, false);
  assert.strictEqual(seq.shouldPause({ sent: 100, bounced: 4, complained: 0 }).pause, true);
  assert.strictEqual(seq.shouldPause({ sent: 100, bounced: 0, complained: 1 }).pause, true);
  assert.strictEqual(seq.shouldPause({ sent: 10, bounced: 5, complained: 1 }).pause, false);
  assert.strictEqual(seq.pickMailbox(['a', 'b'], { a: 5, b: 2 }, { a: 20, b: 20 }), 'b');
  assert.strictEqual(seq.pickMailbox(['a'], { a: 20 }, { a: 20 }), null);
});

test('reply classifier', () => {
  assert.strictEqual(classifyReply('Sounds good, send me the demo'), 'interested');
  assert.strictEqual(classifyReply('Not interested, thanks'), 'not_now');
  assert.strictEqual(classifyReply('STOP'), 'unsubscribe');
  assert.strictEqual(classifyReply('Please remove me from your list'), 'unsubscribe');
  assert.strictEqual(classifyReply('This is spam, I will report you'), 'angry');
  assert.strictEqual(classifyReply('I am out of the office until Monday. This is an automatic reply.'), 'out_of_office');
  assert.strictEqual(classifyReply('Wrong person, I left the company last year'), 'wrong_person');
  assert.strictEqual(classifyReply('hmm ok'), 'other');
  assert.strictEqual(classifyReply('Yes, call me\n\nOn Mon, Chris wrote:\n> not interested'), 'interested');
  assert.match(draftReply({ label: 'interested', firstName: 'Sam' }), /Hi Sam/);
  assert.strictEqual(draftReply({ label: 'angry' }), '');
});

test('every example email passes the checker', () => {
  const vals = examples.SAMPLE;
  assert.strictEqual(examples.FIRST_TOUCHES.length, 12);
  for (const angle of ['agent_referrals', 'warm_vs_cold', 'built_for_market', 'time_saver']) {
    assert.strictEqual(examples.FIRST_TOUCHES.filter((x) => x.angle === angle).length, 3);
  }
  for (const x of examples.FIRST_TOUCHES) {
    const r = rules.checkColdEmail({ touch: 1, subject: templates.fill(x.subject, vals), body: templates.fill(x.body, vals), replyOnly: true });
    assert.deepStrictEqual(r.failures, [], x.subject);
  }
  assert.strictEqual(examples.SEQUENCES.length, 4);
  for (const s of examples.SEQUENCES) {
    for (const n of [1, 2, 3, 4, 5]) {
      const x = s.touches[n];
      const r = rules.checkColdEmail({ touch: n, subject: templates.fill(x.subject, vals), body: templates.fill(x.body, vals), replyOnly: n === 1 });
      assert.deepStrictEqual(r.failures, [], `${s.name} touch ${n}`);
    }
  }
  assert.strictEqual(examples.BREAKUPS.length, 5);
  for (const b of examples.BREAKUPS) assert.deepStrictEqual(rules.checkColdEmail({ touch: 5, subject: b.subject, body: templates.fill(b.body, vals) }).failures, [], b.subject);
});

test('writer: opener is never faked, bad drafts are rewritten with the failures', async () => {
  assert.strictEqual(writer.pickOpener({ requested: 'B' }), 'A');
  assert.strictEqual(writer.pickOpener({ requested: 'C' }), 'A');
  assert.strictEqual(writer.pickOpener({ personalizationFact: 'real fact' }), 'B');
  const prompts = [];
  const bad = JSON.stringify({ subject: 'Act now', body_text: 'Hi {{first_name}},\n\nLeverage our seamless solution!\n\nChris\nFounder, HomeListingAI' });
  const good = JSON.stringify({ subject: 'your agent partners', body_text: GOOD.replace('Hi Sam', 'Hi {{first_name}}') });
  const replies = [bad, good];
  const out = await writer.draftFirstTouch({ complete: async (p) => { prompts.push(p); return replies.shift(); }, params: { angle: 'agent_referrals', firstName: 'Sam' } });
  assert.strictEqual(out.ok, true);
  assert.strictEqual(out.attempts, 2);
  assert.match(prompts[1], /failed these checks/);
  assert.ok(!out.body_text.includes('{{'));
  const stuck = await writer.draftFirstTouch({ complete: async () => bad, params: { angle: 'agent_referrals' }, maxRewrites: 1 });
  assert.strictEqual(stuck.ok, false);
  assert.ok(stuck.flags.length > 0);
});

test('DNS checker reads SPF, DMARC and DKIM records', () => {
  const dnsCheck = require('../scripts/check-cold-email-dns.cjs');
  assert.strictEqual(dnsCheck.checkSpf(['v=spf1 include:mailgun.org ~all']).ok, true);
  assert.strictEqual(dnsCheck.checkSpf(['v=spf1 include:_spf.google.com ~all']).ok, false);
  assert.strictEqual(dnsCheck.checkSpf([]).ok, false);
  assert.strictEqual(dnsCheck.checkDmarc(['v=DMARC1; p=none']).ok, true);
  assert.strictEqual(dnsCheck.checkDmarc([]).ok, false);
  assert.strictEqual(dnsCheck.checkDkim(['k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4']).ok, true);
  assert.strictEqual(dnsCheck.checkDkim([]).ok, false);
});
