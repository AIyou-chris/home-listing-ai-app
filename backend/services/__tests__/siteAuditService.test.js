const test = require('node:test');
const assert = require('node:assert');
const {
  normalizeUrl,
  analyzePage,
  buildFindings,
  scoreCategories,
  overallScore,
  pickTopIssue,
  createSiteAuditService,
} = require('../siteAuditService');

const YEAR = new Date().getFullYear();

// A site with nothing wrong — the control case. If this ever produces findings,
// we are inventing problems for real businesses.
const CLEAN_HTML = `<html><head>
  <title>Ikhaya Studios — Barbershop in Seattle</title>
  <meta name="description" content="Walk-in cuts and fades in Ballard.">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" href="/favicon.ico">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"HairSalon","name":"Ikhaya Studios"}</script>
</head><body>
  <h1>Ikhaya Studios</h1>
  <a href="tel:+12065551234">(206) 555-1234</a>
  <form><input name="email"><button>Send</button></form>
  <img src="/a.jpg" alt="Our shop">
  <p>Walk-in cuts, fades, beard trims and hot towel shaves in the heart of Ballard.
     Open seven days a week. No appointment needed, though we take them if you would
     rather not wait. Our barbers have been cutting in this neighborhood for over a
     decade and we would love to see you.</p>
  <p>&copy; ${YEAR} Ikhaya Studios</p>
</body></html>`;

test('normalizeUrl adds https and rejects junk', () => {
  assert.strictEqual(normalizeUrl('ikhaya.com'), 'https://ikhaya.com/');
  assert.strictEqual(normalizeUrl('https://ikhaya.com/x'), 'https://ikhaya.com/x');
  assert.strictEqual(normalizeUrl('notadomain'), null);
  assert.strictEqual(normalizeUrl(''), null);
  assert.strictEqual(normalizeUrl(null), null);
});

test('analyzePage reads the signals off a page', () => {
  const p = analyzePage(CLEAN_HTML, 'https://ikhaya.com/');
  assert.strictEqual(p.title, 'Ikhaya Studios — Barbershop in Seattle');
  assert.strictEqual(p.metaDescription, 'Walk-in cuts and fades in Ballard.');
  assert.ok(p.viewport);
  assert.strictEqual(p.h1Count, 1);
  assert.strictEqual(p.telLinks, 1);
  assert.strictEqual(p.forms, 1);
  assert.strictEqual(p.hasFavicon, true);
  assert.strictEqual(p.hasLocalBusinessSchema, true);
  assert.strictEqual(p.imagesMissingAlt, 0);
  assert.strictEqual(p.copyrightYear, YEAR);
});

test('a clean site produces ZERO findings', () => {
  const pages = [analyzePage(CLEAN_HTML, 'https://ikhaya.com/')];
  const findings = buildFindings({ pages, speed: null, finalUrl: 'https://ikhaya.com/' });
  assert.deepStrictEqual(findings, []);
  assert.strictEqual(overallScore(scoreCategories(findings, null)), 100);
});

test('flags a phone number that is printed but not tappable', () => {
  const html = `<html><head><title>T</title></head><body><p>Call (206) 555-1234</p></body></html>`;
  const pages = [analyzePage(html, 'https://x.com/')];
  const ids = buildFindings({ pages, speed: null, finalUrl: 'https://x.com/' }).map(f => f.id);
  assert.ok(ids.includes('phone_not_tappable'));
  assert.ok(!ids.includes('no_phone'));
});

test('flags a missing phone number entirely', () => {
  const html = `<html><head><title>T</title></head><body><p>Come visit us</p></body></html>`;
  const pages = [analyzePage(html, 'https://x.com/')];
  const ids = buildFindings({ pages, speed: null, finalUrl: 'https://x.com/' }).map(f => f.id);
  assert.ok(ids.includes('no_phone'));
});

test('flags http-only sites as not secure', () => {
  const pages = [analyzePage(CLEAN_HTML, 'http://x.com/')];
  const f = buildFindings({ pages, speed: null, finalUrl: 'http://x.com/' });
  assert.ok(f.some(x => x.id === 'no_https' && x.severity === 'critical'));
});

test('flags a stale copyright year but not the current one', () => {
  const stale = `<html><head><title>T</title><meta name="viewport" content="width=device-width"></head>
    <body><p>&copy; 2019 Old Shop</p></body></html>`;
  const ids = buildFindings({
    pages: [analyzePage(stale, 'https://x.com/')], speed: null, finalUrl: 'https://x.com/',
  }).map(f => f.id);
  assert.ok(ids.includes('stale_copyright'));

  const fresh = analyzePage(`<body>&copy; ${YEAR} Shop</body>`, 'https://x.com/');
  const freshIds = buildFindings({ pages: [fresh], speed: null, finalUrl: 'https://x.com/' }).map(f => f.id);
  assert.ok(!freshIds.includes('stale_copyright'));
});

test('never invents a speed finding when PageSpeed failed', () => {
  const pages = [analyzePage(CLEAN_HTML, 'https://ikhaya.com/')];
  const findings = buildFindings({ pages, speed: null, finalUrl: 'https://ikhaya.com/' });
  assert.strictEqual(findings.filter(f => f.category === 'speed').length, 0);
});

test('uses the real PageSpeed score for the speed category', () => {
  const pages = [analyzePage(CLEAN_HTML, 'https://ikhaya.com/')];
  const speed = { mobileScore: 31, lcpSeconds: 6.4 };
  const findings = buildFindings({ pages, speed, finalUrl: 'https://ikhaya.com/' });
  const slow = findings.find(f => f.id === 'slow_mobile');
  assert.ok(slow);
  assert.match(slow.impact, /6\.4 seconds/);
  assert.strictEqual(scoreCategories(findings, speed).speed, 31);
});

test('scores never drop below zero', () => {
  const findings = [
    { id: 'a', category: 'contact', severity: 'critical' },
    { id: 'b', category: 'contact', severity: 'critical' },
    { id: 'c', category: 'contact', severity: 'critical' },
  ];
  assert.strictEqual(scoreCategories(findings, null).contact, 0);
});

test('broken links are reported with evidence', () => {
  const pages = [analyzePage(CLEAN_HTML, 'https://ikhaya.com/')];
  const brokenLinks = [{ url: 'https://ikhaya.com/gone', status: 404 }];
  const f = buildFindings({ pages, speed: null, brokenLinks, finalUrl: 'https://ikhaya.com/' });
  const bl = f.find(x => x.id === 'broken_links');
  assert.ok(bl);
  assert.match(bl.evidence, /gone/);
});

test('pickTopIssue prefers a critical contact problem over a critical SEO one', () => {
  const findings = [
    { id: 'no_title', category: 'found', severity: 'critical' },
    { id: 'no_phone', category: 'contact', severity: 'critical' },
    { id: 'no_h1', category: 'found', severity: 'minor' },
  ];
  assert.strictEqual(pickTopIssue(findings).id, 'no_phone');
});

test('auditSite reports unreachable instead of guessing', async () => {
  const svc = createSiteAuditService({
    fetchImpl: async () => { throw new Error('ENOTFOUND'); },
    logger: { warn() {} },
  });
  const out = await svc.auditSite('https://definitely-not-real-xyz.com');
  assert.strictEqual(out.ok, false);
  assert.strictEqual(out.reason, 'unreachable');
});

test('auditSite rejects an invalid url without hitting the network', async () => {
  let called = false;
  const svc = createSiteAuditService({ fetchImpl: async () => { called = true; } });
  const out = await svc.auditSite('nonsense');
  assert.strictEqual(out.ok, false);
  assert.strictEqual(out.reason, 'invalid_url');
  assert.strictEqual(called, false);
});

test('auditSite assembles a full report from a reachable site', async () => {
  const svc = createSiteAuditService({
    fetchImpl: async (url, opts = {}) => {
      if (String(url).includes('pagespeedonline')) {
        return { ok: true, url, status: 200, json: async () => ({
          lighthouseResult: {
            categories: { performance: { score: 0.28 } },
            audits: { 'largest-contentful-paint': { numericValue: 7100 } },
          },
        }) };
      }
      if (opts.method === 'HEAD') return { ok: false, status: 404, url };
      return { ok: true, status: 200, url, text: async () => CLEAN_HTML };
    },
    logger: { warn() {} },
  });

  const out = await svc.auditSite('http://ikhaya.com', { withScreenshots: false });
  assert.strictEqual(out.ok, true);
  assert.strictEqual(out.businessName, 'Ikhaya Studios — Barbershop in Seattle');
  assert.strictEqual(out.speed.mobileScore, 28);
  assert.ok(out.issueCount > 0);
  assert.ok(out.findings.some(f => f.id === 'no_https'));
  assert.ok(out.topIssue);
  assert.ok(out.pagesChecked.length >= 1);
  assert.ok(out.overall >= 0 && out.overall <= 100);
});

// ── JS-rendered shells ───────────────────────────────────────────────────────
// A React/Next site serves almost no markup. Auditing it raw would invent a
// dozen problems for a business that has none, so we must never score one.

const SHELL_HTML = `<html><head><title>Loading…</title></head>
  <body><div id="root"></div><script src="/bundle.js"></script></body></html>`;

test('looksJsRendered spots an empty shell and passes a real page', () => {
  const { looksJsRendered } = require('../siteAuditService');
  assert.strictEqual(looksJsRendered(SHELL_HTML), true);
  assert.strictEqual(looksJsRendered(''), true);
  assert.strictEqual(looksJsRendered(null), true);
  assert.strictEqual(looksJsRendered('{"json":true}'), true);
  assert.strictEqual(looksJsRendered(CLEAN_HTML), false);
});

test('auditSite refuses to score a JS shell when it cannot render it', async () => {
  const svc = createSiteAuditService({
    fetchImpl: async (url) => ({ ok: true, status: 200, url, text: async () => SHELL_HTML }),
    logger: { warn() {} },
  });
  const out = await svc.auditSite('https://shell.com', { withScreenshots: false });
  assert.strictEqual(out.ok, false);
  assert.strictEqual(out.reason, 'needs_render');
});

test('auditSite renders a JS shell when a renderer is available', async () => {
  const realPage = CLEAN_HTML;
  const svc = createSiteAuditService({
    fetchImpl: async (url, opts = {}) => {
      if (String(url).includes('pagespeedonline')) return { ok: false, status: 429, url };
      if (opts.method === 'HEAD') return { ok: true, status: 200, url };
      return { ok: true, status: 200, url, text: async () => SHELL_HTML };
    },
    renderer: async () => realPage,
    logger: { warn() {} },
  });
  const out = await svc.auditSite('https://shell.com', { withScreenshots: false });
  assert.strictEqual(out.ok, true);
  assert.strictEqual(out.rendered, true);
  assert.strictEqual(out.businessName, 'Ikhaya Studios — Barbershop in Seattle');
  assert.strictEqual(out.issueCount, 0); // a clean site, correctly seen as clean
});

test('a renderer that still returns a shell is not trusted', async () => {
  const svc = createSiteAuditService({
    fetchImpl: async (url) => ({ ok: true, status: 200, url, text: async () => SHELL_HTML }),
    renderer: async () => SHELL_HTML,
    logger: { warn() {} },
  });
  const out = await svc.auditSite('https://shell.com', { withScreenshots: false });
  assert.strictEqual(out.ok, false);
  assert.strictEqual(out.reason, 'needs_render');
});
