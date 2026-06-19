'use strict';

const cheerio = require('cheerio');

// Local-parts that are role/catch-all addresses — captured but flagged for manual-only send.
const ROLE_LOCALPARTS = new Set([
  'info', 'admin', 'support', 'sales', 'contact', 'office', 'hello',
  'team', 'help', 'careers', 'jobs', 'marketing', 'noreply', 'no-reply'
]);

// Hard junk — never store these at all.
const JUNK_LOCALPARTS = new Set(['noreply', 'no-reply', 'donotreply', 'do-not-reply']);
const JUNK_DOMAINS = [
  'example.com', 'example.org', 'yourdomain.com', 'domain.com', 'email.com',
  'sentry.io', 'wixpress.com', 'godaddy.com', 'sentry-next.wixpress.com'
];
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i;
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

function isJunk(email) {
  const [local, domain] = email.split('@');
  if (!local || !domain) return true;
  if (JUNK_LOCALPARTS.has(local)) return true;
  if (JUNK_DOMAINS.includes(domain)) return true;
  if (IMAGE_EXT.test(email)) return true;          // logo@2x.png etc.
  if (/@\dx$/.test(email)) return true;            // retina sprite tokens
  if (domain.length < 4 || !domain.includes('.')) return true;
  return false;
}

/**
 * Pure: HTML + page URL -> array of { email, is_role, employer }.
 * Deduped, lowercased, junk removed. employer is best-effort from <title>.
 */
function extractContacts(html, pageUrl) {
  let employer = null;
  try {
    const $ = cheerio.load(html);
    employer = ($('title').first().text() || '').trim() || null;
  } catch (_) { /* malformed html — fall through with null employer */ }

  const seen = new Set();
  const out = [];
  const matches = String(html).match(EMAIL_RE) || [];
  for (const raw of matches) {
    const email = raw.toLowerCase();
    if (seen.has(email)) continue;
    if (isJunk(email)) continue;
    seen.add(email);
    const local = email.split('@')[0];
    out.push({ email, is_role: ROLE_LOCALPARTS.has(local), employer });
  }
  return out;
}

const DEFAULT_CITIES = [
  'Dallas TX', 'Houston TX', 'Atlanta GA', 'Phoenix AZ', 'Los Angeles CA',
  'Miami FL', 'Washington DC', 'Chicago IL', 'New York NY', 'Denver CO'
];

const DEFAULT_QUERY_TEMPLATES = [
  'mortgage loan officers {city} "our team"',
  '"loan officer" {city} email',
  '{city} mortgage company loan officer staff',
  'loan officers in {city}'
];

function createLoLeadScraperService(deps) {
  const {
    supabaseAdmin,
    fetchImpl = fetch,
    env = process.env,
    cities = DEFAULT_CITIES,
    queryTemplates = DEFAULT_QUERY_TEMPLATES,
    engine = (env.LO_SCRAPER_ENGINE || 'google'),
  } = deps || {};

  // ── Engine A: Google Custom Search JSON API (free 100/day) ──
  async function googleSearch(query) {
    const key = env.GOOGLE_CSE_API_KEY;
    const cx = env.GOOGLE_CSE_ID;
    const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(key)}`
      + `&cx=${encodeURIComponent(cx)}&num=10&q=${encodeURIComponent(query)}`;
    const res = await fetchImpl(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map(i => i.link).filter(Boolean);
  }

  // ── Engine B: Apify Google Search Results Scraper (pay-as-you-go) ──
  // Removable: delete this fn + the `engine` switch below to drop Apify entirely.
  async function apifySearch(query) {
    const token = env.APIFY_TOKEN;
    const actorId = env.APIFY_ACTOR_ID || 'nwua9Gu5YrADL7ZDj'; // apify/google-search-scraper
    const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items`
      + `?token=${encodeURIComponent(token)}`;
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queries: query, maxPagesPerQuery: 1, resultsPerPage: 10, countryCode: 'us' }),
    });
    if (!res.ok) return [];
    const items = await res.json();
    const links = [];
    for (const it of (items || [])) {
      for (const r of (it.organicResults || [])) {
        if (r && r.url) links.push(r.url);
      }
    }
    return links;
  }

  const searchFn = engine === 'apify' ? apifySearch : googleSearch;

  async function fetchPage(pageUrl) {
    try {
      const res = await fetchImpl(pageUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HomeListingAI/1.0)' },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return '';
      return await res.text();
    } catch (_) {
      return ''; // skip unreachable/slow pages, keep the run alive
    }
  }

  // Return the subset of `emails` that already exist in `table`'s `email` column.
  async function existingIn(table, emails) {
    if (!emails.length) return new Set();
    const { data, error } = await supabaseAdmin.from(table).select('email').in('email', emails);
    if (error || !data) return new Set();
    return new Set(data.map(r => r.email));
  }

  async function runLoLeadScrape({ maxSearches = 100 } = {}) {
    if (engine === 'apify') {
      if (!env.APIFY_TOKEN) {
        console.warn('[LO Lead Finder] Missing APIFY_TOKEN — skipping run.');
        return { skipped: 'missing_apify_token', searchesUsed: 0, pagesScanned: 0, leadsAdded: 0, dupesSkipped: 0 };
      }
    } else if (!env.GOOGLE_CSE_API_KEY || !env.GOOGLE_CSE_ID) {
      console.warn('[LO Lead Finder] Missing GOOGLE_CSE_API_KEY / GOOGLE_CSE_ID — skipping run.');
      return { skipped: 'missing_google_keys', searchesUsed: 0, pagesScanned: 0, leadsAdded: 0, dupesSkipped: 0 };
    }

    let searchesUsed = 0, pagesScanned = 0, leadsAdded = 0, dupesSkipped = 0;
    const seenThisRun = new Set(); // de-dupe the same email found across pages in one run

    outer:
    for (const city of cities) {
      for (const tpl of queryTemplates) {
        if (searchesUsed >= maxSearches) break outer;
        searchesUsed++;
        const query = tpl.replace('{city}', city);
        let links = [];
        try { links = await searchFn(query); }
        catch (e) { console.warn('[LO Lead Finder] search failed:', e?.message); continue; }

        for (const link of links) {
          const html = await fetchPage(link);
          if (!html) continue;
          pagesScanned++;
          const contacts = extractContacts(html, link);
          if (!contacts.length) continue;

          const emails = contacts.map(c => c.email);
          const [already, suppressed] = await Promise.all([
            existingIn('lo_lead_pool', emails),
            existingIn('lo_suppression_list', emails),
          ]);

          const fresh = contacts.filter(c => {
            if (already.has(c.email) || suppressed.has(c.email) || seenThisRun.has(c.email)) {
              dupesSkipped++; return false;
            }
            seenThisRun.add(c.email);
            return true;
          });
          if (!fresh.length) continue;

          const rows = fresh.map(c => ({
            email: c.email, employer: c.employer, is_role: c.is_role,
            city, source_url: link, status: 'new',
          }));
          const { error } = await supabaseAdmin.from('lo_lead_pool').insert(rows);
          if (!error) leadsAdded += rows.length;
        }
      }
    }
    return { searchesUsed, pagesScanned, leadsAdded, dupesSkipped };
  }

  return { runLoLeadScrape };
}

module.exports = { extractContacts, createLoLeadScraperService, DEFAULT_CITIES, DEFAULT_QUERY_TEMPLATES };
