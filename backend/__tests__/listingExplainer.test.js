const test = require('node:test');
const assert = require('node:assert');
const { buildListingConfig, makeAndStore, questionsFor, streetOf, safeText } = require('../services/listingExplainer');
const { register, PER_HOUR } = require('../routes/listingExplainerRoutes');
const { findVoiceViolations } = require('../services/brandVoice');

const listing = { id: 'L1', address: '123 Palm Ave, Miami, FL', price: 489000, bedrooms: 3, bathrooms: 2 };
const lo = { name: 'Chris Potter', company: 'Acme Mortgage', nmls_number: '123456' };

test('the words come only from the listing\'s real facts and the loan officer\'s own details', () => {
  const c = buildListingConfig({ listing, lo });
  assert.strictEqual(c.business, '123 Palm Ave');
  assert.match(c.answer, /3 bedrooms and 2 baths/);
  assert.match(c.answer, /I am an AI/);
  assert.match(c.endLine, /Chris Potter · NMLS 123456 · Equal Housing Opportunity/);
  assert.strictEqual(c.leadTitle, 'Warm lead sent to Chris');
  assert.match(c.small, /Not a commitment to lend/);
  assert.deepStrictEqual(findVoiceViolations([c.question, c.answer, c.booked, c.endLine].join(' ')), []);
});

test('questions rotate, and a home with no facts still gets a safe generic one', () => {
  assert.strictEqual(questionsFor(listing).length, 3);
  assert.match(buildListingConfig({ listing, lo, variant: 1 }).answer, /\$489,000/);
  assert.match(buildListingConfig({ listing, lo, variant: 2 }).answer, /ask me anything/);
  assert.match(buildListingConfig({ listing, lo, variant: 3 }).answer, /3 bedrooms/, 'it wraps around');
  const bare = buildListingConfig({ listing: { address: '9 Oak St' }, lo });
  assert.match(bare.answer, /ask me anything/);
  assert.ok(!/\$|bedroom/.test(bare.answer), 'no facts are made up');
  assert.strictEqual(questionsFor({ price: 1, bedrooms: 1, bathrooms: 1 })[0].answer.includes('1 bedroom and 1 bath'), true);
});

test('NMLS and name are required, odd characters and banned words are removed', () => {
  assert.throws(() => buildListingConfig({ listing, lo: { ...lo, nmls_number: '' } }), /NEED_NMLS/);
  assert.throws(() => buildListingConfig({ listing, lo: { ...lo, name: '' } }), /NEED_LO_NAME/);
  assert.strictEqual(safeText('Chris <script>alert(1)</script> Potter', 40), 'Chris scriptalert1script Potter');
  assert.strictEqual(buildListingConfig({ listing, lo: { ...lo, nmls_number: 'NMLS #123-456' } }).endLine.includes('NMLS 123456'), true);
  assert.strictEqual(streetOf('1 Very Long Street Name That Goes On And On, Town'), '1 Very Long Street Name That');
});

test('it makes a real MP4 and stores it', async () => {
  const uploads = [];
  const supabaseAdmin = { storage: { from: () => ({ upload: async (p, b, o) => { uploads.push({ p, size: b.length, o }); return { error: null }; }, getPublicUrl: (p) => ({ data: { publicUrl: `https://cdn/${p}` } }) }) } };
  const made = await makeAndStore({ supabaseAdmin, listing, lo });
  assert.match(made.path, /^explainers\/L1\/.+\.mp4$/);
  assert.strictEqual(uploads[0].o.contentType, 'video/mp4');
  assert.ok(uploads[0].size > 100000);
  assert.match(made.url, /^https:\/\/cdn\/explainers\/L1\//);
});

// ---- the route ----
function fakeApp() {
  const routes = {};
  return { post: (path, ...handlers) => { routes[path] = handlers; }, routes };
}
const call = async (app, { loAgentId = 'lo1', listingId = 'L1', body = {} } = {}) => {
  const handlers = app.routes['/api/lo/listings/:listingId/explainer'];
  const handler = handlers[handlers.length - 1];
  const req = { loAgentId, params: { listingId }, body };
  let status = 200; let json;
  await handler(req, { status(c) { status = c; return this; }, json(j) { json = j; return this; } });
  return { status, json };
};
function tables(over = {}) {
  const t = { listing_lo_assignments: [{ listing_id: 'L1', lo_agent_id: 'lo1' }], properties: [{ ...listing, is_published: true, status: 'Active', public_slug: 'palm' }], agents: [{ id: 'lo1', first_name: 'Chris', last_name: 'Potter', company: 'Acme', nmls_number: '123456' }], ...over };
  const from = (name) => { const f = []; const q = { select: () => q, eq: (k, v) => { f.push((r) => r[k] === v); return q; }, limit: () => q, maybeSingle: async () => ({ data: t[name].find((r) => f.every((x) => x(r))) || null }) }; return q; };
  return { from };
}
const setup = (over = {}, deps = {}) => {
  const app = fakeApp(); const made = [];
  register(app, { requireLoAgent: () => {}, supabaseAdmin: tables(over), isListingPublished: (l) => l.is_published === true, toTrimmedOrNull: (v) => (String(v || '').trim() || null), available: async () => true, make: async (a) => { made.push(a); return { url: 'https://cdn/v.mp4' }; }, ...deps });
  return { app, made };
};

test('route: a loan officer assigned to a published home gets a video, with the right details passed in', async () => {
  const { app, made } = setup();
  const r = await call(app, { body: { variant: 1 } });
  assert.deepStrictEqual([r.status, r.json.url], [200, 'https://cdn/v.mp4']);
  assert.strictEqual(made[0].variant, 1);
  assert.strictEqual(made[0].lo.nmls_number, '123456');
  assert.strictEqual(made[0].listing.id, 'L1');
});

test('route: refuses another loan officer, an unpublished home, a missing link and a missing NMLS', async () => {
  assert.strictEqual((await call(setup().app, { loAgentId: 'someone-else' })).status, 403);
  assert.strictEqual((await call(setup({ properties: [{ ...listing, is_published: false, public_slug: 'p' }] }).app)).json.error, 'NOT_PUBLISHED');
  assert.strictEqual((await call(setup({ properties: [{ ...listing, is_published: true, public_slug: '' }] }).app)).json.error, 'NO_SHARE_LINK');
  assert.strictEqual((await call(setup({ agents: [{ id: 'lo1', first_name: 'C', nmls_number: '' }] }).app)).json.error, 'NEED_NMLS');
  assert.strictEqual((await call(setup({}, { available: async () => false }).app)).status, 503);
});

test('route: five an hour per loan officer, then it says so', async () => {
  const { app } = setup();
  for (let i = 0; i < PER_HOUR; i++) assert.strictEqual((await call(app)).status, 200);
  assert.strictEqual((await call(app)).status, 429);
  assert.strictEqual((await call(app, { loAgentId: 'lo1' })).json.error, 'video_rate_limited');
});
