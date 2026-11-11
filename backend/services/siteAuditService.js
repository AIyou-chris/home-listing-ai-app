'use strict';

/**
 * Site Audit — AI YOU cold-outreach engine.
 *
 * Takes a small-business website URL and returns a report of *confirmed*
 * problems, each written in plain English from the customer's point of view,
 * each backed by evidence we can link to. Nothing is inferred or guessed:
 * if we did not positively detect it, we do not report it.
 *
 * Shape of a finding:
 *   { id, category, severity, title, impact, evidence }
 *
 * `impact` is the sentence that goes in the email after "Here's what your
 * customer runs into:" — so it must describe a human being inconvenienced,
 * never a technical defect.
 */

const cheerio = require('cheerio');

const CATEGORIES = ['speed', 'mobile', 'trust', 'found', 'contact'];

const CATEGORY_LABELS = {
  speed: 'Speed',
  mobile: 'Mobile',
  trust: 'Trust',
  found: 'Getting Found',
  contact: 'Easy to Contact',
};

// How many points each severity costs its category. Tuned so a site with one
// critical issue still scores in the 60s (believable), and a site with three
// lands in the 30s (alarming but not cartoonish).
const SEVERITY_WEIGHT = { critical: 45, major: 22, minor: 8 };

const CURRENT_YEAR = () => new Date().getFullYear();

// Pages we try beyond the homepage, in priority order. First N that exist win.
const SECONDARY_PATH_HINTS = ['contact', 'about', 'services', 'menu', 'book', 'appointment'];

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers — exported for tests
// ─────────────────────────────────────────────────────────────────────────────

function normalizeUrl(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (!u.hostname.includes('.')) return null;
    u.hash = '';
    return u.toString();
  } catch (_) {
    return null;
  }
}

function sameHost(a, b) {
  try {
    const ha = new URL(a).hostname.replace(/^www\./, '');
    const hb = new URL(b).hostname.replace(/^www\./, '');
    return ha === hb;
  } catch (_) {
    return false;
  }
}

/**
 * Does this HTML look like an empty shell that JavaScript fills in later?
 *
 * This guard exists because the cost of getting it wrong is asymmetric: a
 * React/Next site serves almost no markup, and analyzing it raw would accuse a
 * perfectly good business of a dozen problems it does not have. When this
 * returns true we render the page for real (or drop the prospect) rather than
 * report anything.
 */
function looksJsRendered(html) {
  if (!html || String(html).trim().length === 0) return true;
  const $ = cheerio.load(html);
  $('script, style, noscript, template').remove();
  const text = ($('body').text() || '').replace(/\s+/g, ' ').trim();
  const hasRoot = $('#root, #__next, #app, [data-reactroot]').length > 0;
  // A real homepage has paragraphs of copy. A shell has <div id="root"></div>.
  // The mount-point check is stricter because those are React/Next for certain.
  if (hasRoot && text.length < 600) return true;
  return text.length < 200;
}

/**
 * Parse one page's HTML into raw, factual signals. No judgement here — just
 * "what is on the page". Judgement happens in buildFindings.
 */
function analyzePage(html, pageUrl) {
  const $ = cheerio.load(html || '');

  const title = ($('title').first().text() || '').trim();
  const metaDescription = ($('meta[name="description"]').attr('content') || '').trim();
  const viewport = ($('meta[name="viewport"]').attr('content') || '').trim();
  const h1Count = $('h1').length;

  const images = $('img').toArray();
  const imagesMissingAlt = images.filter((el) => {
    const alt = $(el).attr('alt');
    return alt === undefined || String(alt).trim() === '';
  }).length;

  const telLinks = $('a[href^="tel:"]').length;
  const mailtoLinks = $('a[href^="mailto:"]').length;
  const forms = $('form').length;

  const bodyText = $('body').text() || '';
  // A phone number printed as text but not tappable is the case we care about.
  const phoneInText = /(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})/.test(bodyText);

  const hasFavicon = $('link[rel~="icon"]').length > 0;

  // Schema.org LocalBusiness (or a subtype) — how Google learns hours/address.
  let hasLocalBusinessSchema = false;
  $('script[type="application/ld+json"]').each((_, el) => {
    const txt = $(el).contents().text() || '';
    if (/"@type"\s*:\s*"?[^"]*(LocalBusiness|Restaurant|Store|HealthAndBeautyBusiness|ProfessionalService|HairSalon|CafeOrCoffeeShop)/i.test(txt)) {
      hasLocalBusinessSchema = true;
    }
  });
  if (!hasLocalBusinessSchema && $('[itemtype*="LocalBusiness"]').length > 0) {
    hasLocalBusinessSchema = true;
  }

  // Assets loaded over plain http on an https page → browser "not secure" warning.
  const mixedContent = [];
  if (/^https:/i.test(pageUrl || '')) {
    $('img[src^="http://"], script[src^="http://"], link[href^="http://"]').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('href');
      if (src && mixedContent.length < 5) mixedContent.push(src);
    });
  }

  // Copyright year in the footer — the cheapest "is this place still open?" signal.
  let copyrightYear = null;
  const yearMatches = bodyText.match(/(?:©|&copy;|copyright)\s*\.?\s*(\d{4})/gi) || [];
  for (const m of yearMatches) {
    const y = parseInt((m.match(/(\d{4})/) || [])[1], 10);
    if (y && y > 1990 && y <= CURRENT_YEAR() + 1) {
      copyrightYear = copyrightYear === null ? y : Math.max(copyrightYear, y);
    }
  }

  const internalLinks = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || /^(mailto:|tel:|javascript:|#)/i.test(href)) return;
    try {
      const abs = new URL(href, pageUrl).toString();
      if (sameHost(abs, pageUrl) && !internalLinks.includes(abs)) internalLinks.push(abs);
    } catch (_) { /* unparseable href — skip */ }
  });

  return {
    url: pageUrl,
    title,
    metaDescription,
    viewport,
    h1Count,
    imageCount: images.length,
    imagesMissingAlt,
    telLinks,
    mailtoLinks,
    forms,
    phoneInText,
    hasFavicon,
    hasLocalBusinessSchema,
    mixedContent,
    copyrightYear,
    internalLinks,
  };
}

/**
 * Turn signals + optional PageSpeed data into customer-facing findings.
 *
 * `pages` is an array of analyzePage results; pages[0] is the homepage.
 * `speed` is { mobileScore, desktopScore, lcpSeconds } or null when the
 * PageSpeed call failed — in which case we emit no speed findings at all
 * rather than inventing one.
 */
function buildFindings({ pages, speed, brokenLinks = [], finalUrl }) {
  const home = pages && pages[0];
  if (!home) return [];

  const out = [];
  const add = (f) => out.push(f);

  // ── Trust ────────────────────────────────────────────────────────────────
  if (!/^https:/i.test(finalUrl || home.url || '')) {
    add({
      id: 'no_https',
      category: 'trust',
      severity: 'critical',
      title: 'Your site is not secure',
      impact: 'Chrome puts a "Not secure" warning right next to your name in the address bar. Most people back out the moment they see it.',
      evidence: finalUrl || home.url,
    });
  }

  if (home.mixedContent.length > 0) {
    add({
      id: 'mixed_content',
      category: 'trust',
      severity: 'major',
      title: 'Parts of your page load insecurely',
      impact: 'Some images and files load over an unsecured connection, so the padlock in the browser breaks and visitors get a warning on a page that should look safe.',
      evidence: home.mixedContent.slice(0, 3).join(', '),
    });
  }

  const thisYear = CURRENT_YEAR();
  if (home.copyrightYear && home.copyrightYear < thisYear - 1) {
    add({
      id: 'stale_copyright',
      category: 'trust',
      severity: 'major',
      title: `Your footer still says ${home.copyrightYear}`,
      impact: `Someone checking whether you're still open sees ${home.copyrightYear} at the bottom of the page and assumes you closed.`,
      evidence: `© ${home.copyrightYear}`,
    });
  }

  if (!home.hasFavicon) {
    add({
      id: 'no_favicon',
      category: 'trust',
      severity: 'minor',
      title: 'No icon in the browser tab',
      impact: 'When someone keeps your page open in a tab, there is a blank sheet of paper where your logo should be, so your tab is the one they close.',
      evidence: home.url,
    });
  }

  // ── Mobile ───────────────────────────────────────────────────────────────
  if (!home.viewport) {
    add({
      id: 'not_mobile_friendly',
      category: 'mobile',
      severity: 'critical',
      title: 'Your site is not built for phones',
      impact: 'On a phone your site loads zoomed out and tiny. People have to pinch and drag just to read your hours, and most of them just leave.',
      evidence: home.url,
    });
  }

  // ── Speed (only when we actually measured it) ────────────────────────────
  if (speed && typeof speed.mobileScore === 'number') {
    if (speed.mobileScore < 50) {
      const secs = speed.lcpSeconds ? `${speed.lcpSeconds.toFixed(1)} seconds` : 'several seconds';
      add({
        id: 'slow_mobile',
        category: 'speed',
        severity: 'critical',
        title: 'Your site is slow on a phone',
        impact: `Your page takes about ${secs} to show up on a phone. Better than half of visitors give up before three seconds — they are gone before they ever see you.`,
        evidence: `Google PageSpeed mobile score: ${speed.mobileScore}/100`,
      });
    } else if (speed.mobileScore < 75) {
      add({
        id: 'sluggish_mobile',
        category: 'speed',
        severity: 'major',
        title: 'Your site drags on a phone',
        impact: 'There is a noticeable wait before anything appears on a phone. Every extra second costs you people who were ready to call.',
        evidence: `Google PageSpeed mobile score: ${speed.mobileScore}/100`,
      });
    }
  }

  // ── Easy to contact ──────────────────────────────────────────────────────
  if (home.telLinks === 0 && home.phoneInText) {
    add({
      id: 'phone_not_tappable',
      category: 'contact',
      severity: 'critical',
      title: 'Your phone number is not tappable',
      impact: 'Your number is printed on the page but it does nothing when tapped. On a phone, people have to memorize it, switch apps, and type it in — so a lot of them never call.',
      evidence: home.url,
    });
  } else if (home.telLinks === 0 && !home.phoneInText) {
    add({
      id: 'no_phone',
      category: 'contact',
      severity: 'critical',
      title: 'There is no phone number on your homepage',
      impact: 'Someone ready to book you right now cannot find a way to reach you without hunting. Most of them go back to Google and pick whoever lists a number.',
      evidence: home.url,
    });
  }

  const anyForm = pages.some((p) => p.forms > 0);
  const anyMailto = pages.some((p) => p.mailtoLinks > 0);
  if (!anyForm && !anyMailto) {
    add({
      id: 'no_contact_path',
      category: 'contact',
      severity: 'major',
      title: 'No way to send you a message',
      impact: 'There is no contact form and no email link anywhere we checked. Anyone who cannot call during business hours has no way to reach you at all.',
      evidence: pages.map((p) => p.url).join(', '),
    });
  }

  // ── Getting found ────────────────────────────────────────────────────────
  if (!home.title) {
    add({
      id: 'no_title',
      category: 'found',
      severity: 'critical',
      title: 'Your page has no title',
      impact: 'Google has nothing to show as your headline in search results, so your listing looks broken next to every competitor.',
      evidence: home.url,
    });
  }

  if (!home.metaDescription) {
    add({
      id: 'no_meta_description',
      category: 'found',
      severity: 'major',
      title: 'Google is guessing your description',
      impact: 'You have not told Google what to say about you, so it grabs a random scrap of text from your page. That grey line under your name in search results is your first impression, and right now it is an accident.',
      evidence: home.url,
    });
  }

  if (!home.hasLocalBusinessSchema) {
    add({
      id: 'no_local_schema',
      category: 'found',
      severity: 'major',
      title: 'Google cannot read your business details',
      impact: 'Your hours, address and phone are not marked up in a way Google understands, so you lose the map box and the "Open now" label that people tap first.',
      evidence: home.url,
    });
  }

  if (home.h1Count === 0) {
    add({
      id: 'no_h1',
      category: 'found',
      severity: 'minor',
      title: 'Your homepage has no main heading',
      impact: 'Search engines look for one clear headline to know what you do. Without it, you are competing for your own name.',
      evidence: home.url,
    });
  }

  if (home.imageCount > 0 && home.imagesMissingAlt / home.imageCount > 0.5) {
    add({
      id: 'images_missing_alt',
      category: 'found',
      severity: 'minor',
      title: `${home.imagesMissingAlt} of your ${home.imageCount} images are unlabeled`,
      impact: 'Google cannot see pictures, only their labels. Your best photos are invisible in image search, and anyone using a screen reader hears nothing.',
      evidence: `${home.imagesMissingAlt}/${home.imageCount} images`,
    });
  }

  if (brokenLinks.length > 0) {
    add({
      id: 'broken_links',
      category: 'found',
      severity: brokenLinks.length > 2 ? 'major' : 'minor',
      title: `${brokenLinks.length} link${brokenLinks.length === 1 ? '' : 's'} on your site go nowhere`,
      impact: 'A visitor clicks and lands on an error page. Most people assume the whole site is broken and leave rather than come back and try another link.',
      evidence: brokenLinks.slice(0, 3).map((b) => b.url).join(', '),
    });
  }

  return out;
}

/** Category scores, 0-100. A category with no findings stays at 100. */
function scoreCategories(findings, speed) {
  const scores = {};
  for (const cat of CATEGORIES) scores[cat] = 100;

  for (const f of findings) {
    const weight = SEVERITY_WEIGHT[f.severity] || 0;
    scores[f.category] = Math.max(0, scores[f.category] - weight);
  }

  // When we have a real measurement, it beats our deductions for speed.
  if (speed && typeof speed.mobileScore === 'number') {
    scores.speed = speed.mobileScore;
  }

  return scores;
}

/** Overall score — the average, rounded. Simple on purpose; it goes in an email. */
function overallScore(scores) {
  const vals = CATEGORIES.map((c) => scores[c]).filter((v) => typeof v === 'number');
  if (!vals.length) return 0;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

/** The single issue to lead with: worst severity, then most-damaging category. */
function pickTopIssue(findings) {
  if (!findings.length) return null;
  const rank = { critical: 0, major: 1, minor: 2 };
  const catRank = { contact: 0, mobile: 1, speed: 2, trust: 3, found: 4 };
  return [...findings].sort((a, b) => {
    const r = (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9);
    if (r !== 0) return r;
    return (catRank[a.category] ?? 9) - (catRank[b.category] ?? 9);
  })[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// The runner — network, PageSpeed, screenshots. Injectable for tests.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 15000;
const UA = 'Mozilla/5.0 (compatible; AIYouSiteCheck/1.0; +https://anaiyou.com)';

function createSiteAuditService(deps) {
  const {
    fetchImpl = fetch,
    env = process.env,
    screenshotter = null,       // async (url) => { mobile: Buffer, desktop: Buffer }
    renderer = null,            // async (url) => html  (headless browser; for JS-rendered sites)
    logger = console,
  } = deps || {};

  async function timedFetch(url, opts = {}) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs || DEFAULT_TIMEOUT_MS);
    try {
      return await fetchImpl(url, {
        redirect: 'follow',
        headers: { 'User-Agent': UA, Accept: 'text/html,*/*' },
        ...opts,
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  // Try https first; fall back to http so we can positively report "no https"
  // instead of silently failing on sites that only answer on port 80.
  async function fetchHomepage(url) {
    try {
      const res = await timedFetch(url);
      if (res.ok) return { res, html: await res.text(), finalUrl: res.url || url };
    } catch (err) {
      logger.warn?.(`[siteAudit] https fetch failed for ${url}: ${err.message}`);
    }
    if (/^https:/i.test(url)) {
      const httpUrl = url.replace(/^https:/i, 'http:');
      try {
        const res = await timedFetch(httpUrl);
        if (res.ok) return { res, html: await res.text(), finalUrl: res.url || httpUrl };
      } catch (err) {
        logger.warn?.(`[siteAudit] http fallback failed for ${httpUrl}: ${err.message}`);
      }
    }
    return null;
  }

  /** Google PageSpeed Insights. Free; returns null on any failure (never fakes). */
  async function runPageSpeed(url) {
    const key = env.PAGESPEED_API_KEY || env.GOOGLE_PAGESPEED_KEY;
    const base = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
    const qs = `?url=${encodeURIComponent(url)}&strategy=mobile&category=performance`
      + (key ? `&key=${encodeURIComponent(key)}` : '');
    try {
      const res = await timedFetch(base + qs, { timeoutMs: 60000 });
      if (!res.ok) {
        logger.warn?.(`[siteAudit] pagespeed ${res.status} for ${url}`);
        return null;
      }
      const data = await res.json();
      const perf = data?.lighthouseResult?.categories?.performance?.score;
      const lcpMs = data?.lighthouseResult?.audits?.['largest-contentful-paint']?.numericValue;
      if (typeof perf !== 'number') return null;
      return {
        mobileScore: Math.round(perf * 100),
        lcpSeconds: typeof lcpMs === 'number' ? lcpMs / 1000 : null,
      };
    } catch (err) {
      logger.warn?.(`[siteAudit] pagespeed failed for ${url}: ${err.message}`);
      return null;
    }
  }

  /** HEAD-check a sample of internal links. Only 404/410 count as broken. */
  async function findBrokenLinks(links, limit) {
    const sample = links.slice(0, limit);
    const results = await Promise.all(sample.map(async (url) => {
      try {
        const res = await timedFetch(url, { method: 'HEAD', timeoutMs: 8000 });
        // Some servers reject HEAD outright — confirm with a GET before accusing.
        if (res.status === 405 || res.status === 501) {
          const get = await timedFetch(url, { timeoutMs: 8000 });
          return get.status === 404 || get.status === 410 ? { url, status: get.status } : null;
        }
        return res.status === 404 || res.status === 410 ? { url, status: res.status } : null;
      } catch (_) {
        return null; // network flake is not evidence of a broken link
      }
    }));
    return results.filter(Boolean);
  }

  /** Pick the most useful secondary pages (contact/about/services) to also check. */
  function pickSecondaryPages(internalLinks, homeUrl, max) {
    const picked = [];
    for (const hint of SECONDARY_PATH_HINTS) {
      if (picked.length >= max) break;
      const match = internalLinks.find((l) => {
        if (picked.includes(l) || l === homeUrl) return false;
        try { return new URL(l).pathname.toLowerCase().includes(hint); } catch (_) { return false; }
      });
      if (match) picked.push(match);
    }
    return picked;
  }

  /**
   * Full audit. Returns null only when the site could not be reached at all —
   * that prospect is dropped rather than pitched on a site we never saw.
   */
  async function auditSite(rawUrl, options = {}) {
    const {
      maxPages = 3,
      linkSampleSize = 12,
      withScreenshots = true,
    } = options;

    const url = normalizeUrl(rawUrl);
    if (!url) return { ok: false, reason: 'invalid_url', url: rawUrl };

    const home = await fetchHomepage(url);
    if (!home) return { ok: false, reason: 'unreachable', url };

    const finalUrl = home.finalUrl;

    // Never audit an empty shell — we would invent problems that do not exist.
    let homeHtml = home.html;
    let rendered = false;
    if (looksJsRendered(homeHtml)) {
      if (!renderer) {
        return { ok: false, reason: 'needs_render', url, finalUrl };
      }
      try {
        const out = await renderer(finalUrl);
        if (!out || looksJsRendered(out)) {
          return { ok: false, reason: 'needs_render', url, finalUrl };
        }
        homeHtml = out;
        rendered = true;
      } catch (err) {
        logger.warn?.(`[siteAudit] render failed ${finalUrl}: ${err.message}`);
        return { ok: false, reason: 'needs_render', url, finalUrl };
      }
    }

    const pages = [analyzePage(homeHtml, finalUrl)];

    const secondary = pickSecondaryPages(pages[0].internalLinks, finalUrl, maxPages - 1);
    for (const link of secondary) {
      try {
        const res = await timedFetch(link);
        if (!res.ok) continue;
        const html = await res.text();
        if (looksJsRendered(html)) continue; // shell page — no signal, skip it
        pages.push(analyzePage(html, res.url || link));
      } catch (err) {
        logger.warn?.(`[siteAudit] secondary page failed ${link}: ${err.message}`);
      }
    }

    const [speed, brokenLinks, shots] = await Promise.all([
      runPageSpeed(finalUrl),
      findBrokenLinks(pages[0].internalLinks, linkSampleSize),
      withScreenshots && screenshotter
        ? screenshotter(finalUrl).catch((err) => {
            logger.warn?.(`[siteAudit] screenshot failed ${finalUrl}: ${err.message}`);
            return null;
          })
        : Promise.resolve(null),
    ]);

    const findings = buildFindings({ pages, speed, brokenLinks, finalUrl });
    const scores = scoreCategories(findings, speed);

    return {
      ok: true,
      url,
      finalUrl,
      businessName: pages[0].title || null,
      pagesChecked: pages.map((p) => p.url),
      findings,
      issueCount: findings.length,
      scores,
      overall: overallScore(scores),
      topIssue: pickTopIssue(findings),
      speed,
      brokenLinks,
      screenshots: shots,
      rendered,
      auditedAt: new Date().toISOString(),
    };
  }

  return { auditSite, runPageSpeed, findBrokenLinks, pickSecondaryPages };
}

module.exports = {
  createSiteAuditService,
  CATEGORIES,
  CATEGORY_LABELS,
  SEVERITY_WEIGHT,
  normalizeUrl,
  sameHost,
  analyzePage,
  looksJsRendered,
  buildFindings,
  scoreCategories,
  overallScore,
  pickTopIssue,
  SECONDARY_PATH_HINTS,
};
