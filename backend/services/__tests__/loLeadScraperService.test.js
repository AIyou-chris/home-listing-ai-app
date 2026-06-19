const test = require('node:test');
const assert = require('node:assert');
const { extractContacts } = require('../loLeadScraperService');

test('extracts a real email and lowercases it', () => {
  const html = `<html><head><title>Acme Mortgage — Our Team</title></head>
    <body><p>Contact John at John.Smith@AcmeMortgage.com</p></body></html>`;
  const out = extractContacts(html, 'https://acmemortgage.com/team');
  const emails = out.map(c => c.email);
  assert.ok(emails.includes('john.smith@acmemortgage.com'));
  assert.strictEqual(out[0].employer, 'Acme Mortgage — Our Team');
});

test('returns empty array when no email present', () => {
  const html = `<html><body><p>Call us at 555-1234</p></body></html>`;
  assert.deepStrictEqual(extractContacts(html, 'https://x.com'), []);
});

test('dedupes the same email appearing twice', () => {
  const html = `<body>a@b.com and again a@b.com</body>`;
  const out = extractContacts(html, 'https://b.com');
  assert.strictEqual(out.length, 1);
});

test('drops junk: noreply, image filenames, example/placeholder domains', () => {
  const html = `<body>
    noreply@brokerage.com
    logo@2x.png
    hero@2x.jpg
    someone@example.com
    you@yourdomain.com
    real.lo@brokerage.com
  </body>`;
  const emails = extractContacts(html, 'https://brokerage.com').map(c => c.email);
  assert.deepStrictEqual(emails, ['real.lo@brokerage.com']);
});

test('flags role addresses with is_role = true', () => {
  const html = `<body>info@brokerage.com jane.lo@brokerage.com</body>`;
  const out = extractContacts(html, 'https://brokerage.com');
  const info = out.find(c => c.email === 'info@brokerage.com');
  const jane = out.find(c => c.email === 'jane.lo@brokerage.com');
  assert.strictEqual(info.is_role, true);
  assert.strictEqual(jane.is_role, false);
});

// ---- runLoLeadScrape orchestration ----

function makeFakeSupabase({ existingEmails = [], suppressed = [] } = {}) {
  const inserted = [];
  const api = {
    inserted,
    from(table) {
      return {
        _table: table,
        select() { return this; },
        eq() { return this; },
        in(_col, vals) {
          const pool = table === 'lo_suppression_list' ? suppressed : existingEmails;
          const data = vals.filter(v => pool.includes(v)).map(email => ({ email }));
          return Promise.resolve({ data, error: null });
        },
        async insert(rows) {
          inserted.push(...(Array.isArray(rows) ? rows : [rows]));
          return { error: null };
        },
        async upsert() { return { error: null }; },
        maybeSingle() { return Promise.resolve({ data: { city_index: 0 }, error: null }); },
        single() { return Promise.resolve({ data: { city_index: 0 }, error: null }); },
      };
    }
  };
  return api;
}

test('runLoLeadScrape respects maxSearches cap', async () => {
  let searchCalls = 0;
  const fakeFetch = async (url) => {
    if (url.includes('googleapis.com')) {
      searchCalls++;
      return { ok: true, json: async () => ({ items: [] }) };
    }
    return { ok: true, text: async () => '' };
  };
  const svc = require('../loLeadScraperService').createLoLeadScraperService({
    supabaseAdmin: makeFakeSupabase(),
    fetchImpl: fakeFetch,
    env: { GOOGLE_CSE_API_KEY: 'k', GOOGLE_CSE_ID: 'id' },
    cities: ['Dallas TX', 'Houston TX'],
    queryTemplates: ['loan officers in {city}'],
  });
  const result = await svc.runLoLeadScrape({ maxSearches: 1 });
  assert.strictEqual(searchCalls, 1);
  assert.strictEqual(result.searchesUsed, 1);
});

test('runLoLeadScrape stores extracted emails, skipping dupes and suppressed', async () => {
  const fakeFetch = async (url) => {
    if (url.includes('googleapis.com')) {
      return { ok: true, json: async () => ({ items: [{ link: 'https://acme.com/team' }] }) };
    }
    return {
      ok: true,
      text: async () => `<body>new.lo@acme.com dupe@acme.com bad@acme.com</body>`,
    };
  };
  const supa = makeFakeSupabase({ existingEmails: ['dupe@acme.com'], suppressed: ['bad@acme.com'] });
  const svc = require('../loLeadScraperService').createLoLeadScraperService({
    supabaseAdmin: supa,
    fetchImpl: fakeFetch,
    env: { GOOGLE_CSE_API_KEY: 'k', GOOGLE_CSE_ID: 'id' },
    cities: ['Dallas TX'],
    queryTemplates: ['loan officers in {city}'],
  });
  const result = await svc.runLoLeadScrape({ maxSearches: 1 });
  const storedEmails = supa.inserted.map(r => r.email);
  assert.deepStrictEqual(storedEmails, ['new.lo@acme.com']);
  assert.strictEqual(result.leadsAdded, 1);
});

test('runLoLeadScrape no-ops gracefully when Google keys are missing', async () => {
  const svc = require('../loLeadScraperService').createLoLeadScraperService({
    supabaseAdmin: makeFakeSupabase(),
    fetchImpl: async () => { throw new Error('should not be called'); },
    env: {},
    cities: ['Dallas TX'],
    queryTemplates: ['loan officers in {city}'],
  });
  const result = await svc.runLoLeadScrape({ maxSearches: 5 });
  assert.strictEqual(result.skipped, 'missing_google_keys');
  assert.strictEqual(result.leadsAdded, 0);
});

// ---- Apify engine (alternate search source) ----

test('apify engine: reads organicResults urls and stores extracted emails', async () => {
  let apifyCalled = false;
  const fakeFetch = async (url, opts) => {
    if (url.includes('api.apify.com')) {
      apifyCalled = true;
      assert.strictEqual(opts.method, 'POST');                 // run-sync POST
      assert.ok(opts.body.includes('loan officers in Dallas')); // query passed through
      return { ok: true, json: async () => ([
        { organicResults: [{ url: 'https://acme.com/team' }, { url: 'https://b.com/staff' }] },
      ]) };
    }
    return { ok: true, text: async () => `<body>jane.lo@acme.com</body>` };
  };
  const supa = makeFakeSupabase();
  const svc = require('../loLeadScraperService').createLoLeadScraperService({
    supabaseAdmin: supa,
    fetchImpl: fakeFetch,
    engine: 'apify',
    env: { APIFY_TOKEN: 't' },
    cities: ['Dallas TX'],
    queryTemplates: ['loan officers in {city}'],
  });
  const result = await svc.runLoLeadScrape({ maxSearches: 1 });
  assert.ok(apifyCalled, 'apify endpoint should be hit');
  assert.deepStrictEqual(supa.inserted.map(r => r.email), ['jane.lo@acme.com']);
  assert.strictEqual(result.leadsAdded, 1);
});

test('apify engine: google maps actor shape — uses emails directly, no page fetch', async () => {
  let pageFetched = false;
  const fakeFetch = async (url, opts) => {
    if (url.includes('api.apify.com')) {
      return { ok: true, json: async () => ([
        { title: 'Acme Mortgage', website: 'https://acme.com', emails: ['Jane.LO@Acme.com', 'info@acme.com'] },
        { title: 'No Email Co', website: 'https://x.com', emails: [] },
      ]) };
    }
    pageFetched = true; // should NOT happen — maps gives emails directly
    return { ok: true, text: async () => '<body>nope@nope.com</body>' };
  };
  const supa = makeFakeSupabase();
  const svc = require('../loLeadScraperService').createLoLeadScraperService({
    supabaseAdmin: supa,
    fetchImpl: fakeFetch,
    engine: 'apify',
    env: { APIFY_TOKEN: 't' },
    cities: ['Dallas TX'],
    queryTemplates: ['mortgage companies {city}'],
  });
  const result = await svc.runLoLeadScrape({ maxSearches: 1 });
  assert.strictEqual(pageFetched, false, 'maps shape should not trigger page fetches');
  const stored = supa.inserted.map(r => r.email).sort();
  assert.deepStrictEqual(stored, ['info@acme.com', 'jane.lo@acme.com']);
  const info = supa.inserted.find(r => r.email === 'info@acme.com');
  assert.strictEqual(info.is_role, true);
  assert.strictEqual(info.employer, 'Acme Mortgage');
  assert.strictEqual(result.leadsAdded, 2);
});

test('apify engine no-ops gracefully without APIFY_TOKEN', async () => {
  const svc = require('../loLeadScraperService').createLoLeadScraperService({
    supabaseAdmin: makeFakeSupabase(),
    fetchImpl: async () => { throw new Error('should not be called'); },
    engine: 'apify',
    env: {},
    cities: ['Dallas TX'],
    queryTemplates: ['loan officers in {city}'],
  });
  const result = await svc.runLoLeadScrape({ maxSearches: 3 });
  assert.strictEqual(result.skipped, 'missing_apify_token');
  assert.strictEqual(result.leadsAdded, 0);
});
