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

function makeFakeSupabase({ existingEmails = [], suppressed = [], existingLinkedins = [] } = {}) {
  const inserted = [];
  const api = {
    inserted,
    from(table) {
      return {
        _table: table,
        select() { return this; },
        eq() { return this; },
        in(col, vals) {
          const pool = table === 'lo_suppression_list' ? suppressed
            : col === 'linkedin' ? existingLinkedins
            : existingEmails;
          const data = vals.filter(v => pool.includes(v)).map(v => ({ [col]: v }));
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

test('leads-finder engine: maps lead rows to pool with rich fields, drops no-email + dupes', async () => {
  const fakeFetch = async (url, opts) => {
    if (url.includes('api.apify.com')) {
      const body = JSON.parse(opts.body);
      assert.deepStrictEqual(body.email_status, ['validated']);   // validated-only
      assert.ok(body.contact_job_title.includes('loan officer'));  // targets LOs
      assert.strictEqual(body.fetch_count, 10);                    // honors fetchCount
      return { ok: true, json: async () => ([
        { email: 'Nick@x.com', full_name: 'Nick Lovato', company_name: 'Reliant',
          company_website: 'https://r.com', mobile_number: '+1 801', linkedin: 'https://li/nick',
          job_title: 'Senior Loan Officer', city: 'Salt Lake City', state: 'Utah' },
        { email: null, full_name: 'No Email' },                        // dropped (no email)
        { email: 'info@brokerage.com', full_name: 'Front Desk', company_name: 'Brk' }, // role-flagged
      ]) };
    }
    throw new Error('leads mode must not fetch web pages');
  };
  const supa = makeFakeSupabase();
  const svc = require('../loLeadScraperService').createLoLeadScraperService({
    supabaseAdmin: supa, fetchImpl: fakeFetch, engine: 'leads',
    env: { APIFY_TOKEN: 't' },
  });
  const result = await svc.runLoLeadScrape({ fetchCount: 10 });
  assert.strictEqual(supa.inserted.length, 2);
  const nick = supa.inserted.find(r => r.email === 'nick@x.com');
  assert.strictEqual(nick.name, 'Nick Lovato');
  assert.strictEqual(nick.employer, 'Reliant');
  assert.strictEqual(nick.phone, '+1 801');
  assert.strictEqual(nick.linkedin, 'https://li/nick');
  assert.strictEqual(nick.job_title, 'Senior Loan Officer');
  assert.strictEqual(nick.city, 'Salt Lake City, Utah');
  const info = supa.inserted.find(r => r.email === 'info@brokerage.com');
  assert.strictEqual(info.is_role, true);
  assert.strictEqual(result.leadsAdded, 2);
});

test('importApifyLeads: reads last run dataset and stores mapped leads (free-plan path)', async () => {
  const fakeFetch = async (url) => {
    if (url.includes('/runs/last/dataset/items')) {
      assert.ok(url.includes('token='));
      assert.ok(url.includes('status=SUCCEEDED'));
      return { ok: true, json: async () => ([
        { email: 'A@b.com', full_name: 'A B', company_name: 'Co', job_title: 'Loan Officer',
          mobile_number: '555', linkedin: 'https://li/ab', company_website: 'https://w', city: 'X', state: 'Y' },
        { email: null, full_name: 'No Email' },        // dropped
      ]) };
    }
    throw new Error('unexpected url ' + url);
  };
  const supa = makeFakeSupabase();
  const svc = require('../loLeadScraperService').createLoLeadScraperService({
    supabaseAdmin: supa, fetchImpl: fakeFetch, env: { APIFY_TOKEN: 't' },
  });
  const r = await svc.importApifyLeads();
  assert.strictEqual(supa.inserted.length, 1);
  assert.strictEqual(supa.inserted[0].email, 'a@b.com');
  assert.strictEqual(supa.inserted[0].name, 'A B');
  assert.strictEqual(supa.inserted[0].phone, '555');
  assert.strictEqual(r.rowsFetched, 2);
  assert.strictEqual(r.leadsAdded, 1);
});

test('importApifyLeads: reads a specific datasetId when provided', async () => {
  let hitDataset = false;
  const fakeFetch = async (url) => {
    if (url.includes('/datasets/DS123/items')) { hitDataset = true; return { ok: true, json: async () => ([]) }; }
    throw new Error('should use dataset endpoint, got ' + url);
  };
  const svc = require('../loLeadScraperService').createLoLeadScraperService({
    supabaseAdmin: makeFakeSupabase(), fetchImpl: fakeFetch, env: { APIFY_TOKEN: 't' },
  });
  await svc.importApifyLeads({ datasetId: 'DS123' });
  assert.ok(hitDataset);
});

test('importApifyLeads no-ops gracefully without APIFY_TOKEN', async () => {
  const svc = require('../loLeadScraperService').createLoLeadScraperService({
    supabaseAdmin: makeFakeSupabase(), fetchImpl: async () => { throw new Error('no'); }, env: {},
  });
  const r = await svc.importApifyLeads();
  assert.strictEqual(r.skipped, 'missing_apify_token');
  assert.strictEqual(r.leadsAdded, 0);
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

// ---- HarvestAPI LinkedIn engine (engine D) ----

const HARVEST_ROW_FULL = {
  name: 'Nicki Soares',
  firstName: 'Nicki',
  lastName: 'Soares',
  headline: 'Mortgage Consultant | Content Creator',
  emails: ['nicki@leaderone.com'],
  linkedinUrl: 'https://www.linkedin.com/in/nicki-soares-a0a8aa156',
  publicIdentifier: 'nicki-soares-a0a8aa156',
  location: { linkedinText: 'Yuba City, California, United States', parsed: { city: 'Yuba City', state: 'California', text: 'Yuba City, CA, United States' } },
  currentPosition: [{ position: 'Mortgage Lender', companyName: 'LeaderOne Financial' }],
};

const HARVEST_ROW_NO_EMAIL = {
  firstName: 'Jonathan',
  lastName: 'Fesser',
  headline: 'Commercial & Residential Mortgage Loan Officer at Loan Factory',
  emails: [],
  linkedinUrl: 'https://www.linkedin.com/in/jonathan-fesser-611b88234',
  publicIdentifier: 'jonathan-fesser-611b88234',
  location: { linkedinText: 'Las Vegas, Nevada, United States', parsed: { city: 'Las Vegas', state: 'Nevada' } },
  currentPosition: [{ position: 'Mortgage Loan Officer', companyName: 'Loan Factory' }],
};

test('harvest engine: stores LinkedIn profiles, keeping email-less leads for the DM queue', async () => {
  let harvestInput = null;
  const fakeFetch = async (url, opts) => {
    assert.ok(url.includes('api.apify.com/v2/acts/qXMa8kADnUQdmz18G/run-sync-get-dataset-items'));
    harvestInput = JSON.parse(opts.body);
    return { ok: true, json: async () => [HARVEST_ROW_FULL, HARVEST_ROW_NO_EMAIL] };
  };
  const supa = makeFakeSupabase();
  const svc = require('../loLeadScraperService').createLoLeadScraperService({
    supabaseAdmin: supa, fetchImpl: fakeFetch, engine: 'harvest', env: { APIFY_TOKEN: 't' },
  });
  const result = await svc.runLoLeadScrape({ fetchCount: 25 });

  assert.strictEqual(harvestInput.maxItems, 25);
  assert.deepStrictEqual(harvestInput.locations, ['United States']);
  assert.ok(harvestInput.currentJobTitles.includes('Loan Officer'));

  assert.strictEqual(result.leadsAdded, 2);
  const nicki = supa.inserted.find(r => r.email === 'nicki@leaderone.com');
  assert.strictEqual(nicki.name, 'Nicki Soares');
  assert.strictEqual(nicki.employer, 'LeaderOne Financial');
  assert.strictEqual(nicki.job_title, 'Mortgage Lender');
  assert.strictEqual(nicki.city, 'Yuba City, California');
  assert.strictEqual(nicki.linkedin, 'https://www.linkedin.com/in/nicki-soares-a0a8aa156');

  const jon = supa.inserted.find(r => r.name === 'Jonathan Fesser');
  assert.strictEqual(jon.email, null); // LinkedIn-only lead — DM queue material
  assert.strictEqual(jon.linkedin, 'https://www.linkedin.com/in/jonathan-fesser-611b88234');
});

test('harvest engine: dedupes by LinkedIn URL when the lead has no email', async () => {
  const fakeFetch = async () => ({ ok: true, json: async () => [HARVEST_ROW_NO_EMAIL, HARVEST_ROW_NO_EMAIL] });
  const supa = makeFakeSupabase({ existingLinkedins: [] });
  const svc = require('../loLeadScraperService').createLoLeadScraperService({
    supabaseAdmin: supa, fetchImpl: fakeFetch, engine: 'harvest', env: { APIFY_TOKEN: 't' },
  });
  const result = await svc.runLoLeadScrape({});
  assert.strictEqual(result.leadsAdded, 1);
  assert.strictEqual(result.dupesSkipped, 1);

  // Already in the pool from a previous run → skipped entirely.
  const supa2 = makeFakeSupabase({ existingLinkedins: [HARVEST_ROW_NO_EMAIL.linkedinUrl] });
  const svc2 = require('../loLeadScraperService').createLoLeadScraperService({
    supabaseAdmin: supa2, fetchImpl: fakeFetch, engine: 'harvest', env: { APIFY_TOKEN: 't' },
  });
  const result2 = await svc2.runLoLeadScrape({});
  assert.strictEqual(result2.leadsAdded, 0);
  assert.strictEqual(result2.dupesSkipped, 2);
});

test('importApifyLeads: sniffs HarvestAPI rows in a pasted dataset and maps them', async () => {
  const fakeFetch = async (url) => {
    assert.ok(url.includes('/datasets/DSHARVEST/items'));
    return { ok: true, json: async () => [HARVEST_ROW_NO_EMAIL] };
  };
  const supa = makeFakeSupabase();
  const svc = require('../loLeadScraperService').createLoLeadScraperService({
    supabaseAdmin: supa, fetchImpl: fakeFetch, env: { APIFY_TOKEN: 't' },
  });
  const r = await svc.importApifyLeads({ datasetId: 'DSHARVEST' });
  assert.strictEqual(r.leadsAdded, 1);
  assert.strictEqual(supa.inserted[0].email, null);
  assert.strictEqual(supa.inserted[0].linkedin, HARVEST_ROW_NO_EMAIL.linkedinUrl);
});

test('importApifyLeads: source harvest reads the harvest actor last run', async () => {
  let urlSeen = '';
  const fakeFetch = async (url) => { urlSeen = url; return { ok: true, json: async () => [] }; };
  const svc = require('../loLeadScraperService').createLoLeadScraperService({
    supabaseAdmin: makeFakeSupabase(), fetchImpl: fakeFetch, env: { APIFY_TOKEN: 't' },
  });
  await svc.importApifyLeads({ source: 'harvest' });
  assert.ok(urlSeen.includes('/acts/qXMa8kADnUQdmz18G/runs/last/dataset/items'));
});

test('CSV import: keeps a row with LinkedIn but no email (DM-only lead)', async () => {
  const supa = makeFakeSupabase();
  const svc = require('../loLeadScraperService').createLoLeadScraperService({
    supabaseAdmin: supa, fetchImpl: async () => { throw new Error('no'); }, env: {},
  });
  const r = await svc.importCsvRows([
    { name: 'DM Only', linkedin: 'https://linkedin.com/in/dm-only', company: 'Acme' },
    { name: 'No Contact At All', company: 'Acme' },
  ]);
  assert.strictEqual(r.leadsAdded, 1);
  assert.strictEqual(supa.inserted[0].email, null);
  assert.strictEqual(supa.inserted[0].linkedin, 'https://linkedin.com/in/dm-only');
});
