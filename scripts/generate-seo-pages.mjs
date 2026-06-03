import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const INDEX_PATH = path.join(DIST_DIR, 'index.html');

dotenv.config({ path: path.join(ROOT_DIR, '.env.local'), override: false });
dotenv.config({ path: path.join(ROOT_DIR, '.env'), override: false });

const SITE_URL = String(
  process.env.SEO_SITE_URL ||
  process.env.DASHBOARD_BASE_URL ||
  process.env.VITE_APP_URL ||
  'https://homelistingai.com'
).replace(/\/+$/, '');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';

const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

const STATIC_ROUTES = [
  {
    route: '/',
    title: 'HomeListingAI | Warm Leads & Agent Partnerships for Loan Officers',
    description:
      'Loan officers: send one WOW Link, get warm buyer leads from every agent listing — co-branded with your name and NMLS #. AI listing pages, a 24/7 buyer chatbot, and compliance guardrails you control. 3-day free trial.',
    image: '/og-image.png',
    type: 'website',
    // Preserve the rich JSON-LD baked into index.html (Organization, WebSite,
    // SoftwareApplication, 12-question FAQPage). index.html is the single source.
    preserveJsonLd: true,
    bodyHtml: [
      '<main>',
      '<h1>HomeListingAI — Warm Leads &amp; Agent Partnerships for Loan Officers</h1>',
      '<p>HomeListingAI is an AI-powered lead generation and agent-partnership platform built specifically for mortgage loan officers. Instead of buying cold internet leads, a loan officer sends a co-branded AI listing page — the WOW Link — to a real estate agent partner. Every buyer who engages with that page becomes a warm lead routed back to the loan officer in real time.</p>',
      '<h2>How it works</h2>',
      '<p>The loan officer invites an agent partner and sends a WOW Link. The agent&rsquo;s listing goes live with a 24/7 AI buyer chatbot, a full share kit (tracked QR code, social assets, open-house flyer, and property report), all co-branded with the loan officer&rsquo;s name and NMLS #. When a buyer asks about rates, pre-approval, or the property, the warm lead is delivered to both the agent and the loan officer at the same time.</p>',
      '<h2>Why loan officers use it</h2>',
      '<ul>',
      '<li><strong>Warm leads, not cold lists:</strong> every lead is a buyer who already raised their hand on a live listing page.</li>',
      '<li><strong>Agent partnerships that stick:</strong> the agent gets a free tool that makes their listings perform better, which builds loyalty to the loan officer who provided it.</li>',
      '<li><strong>Compliance you control:</strong> platform guardrails are always on, and loan officers can upload their company&rsquo;s own compliance rules so the AI follows them in every chat and every piece of marketing it writes.</li>',
      '<li><strong>Fast follow-up:</strong> automatic 24-hour and 72-hour reminders if an agent hasn&rsquo;t opened the WOW Link, plus instant alerts when an agent claims their account.</li>',
      '</ul>',
      '<h2>Pricing</h2>',
      '<p>The LO plan is $149/month (20 active listings, 250 SMS/month, full co-branding, warm-lead alerts). LO Pro is $299/month (50 active listings, unlimited SMS, priority lead routing, ROI dashboard). Both are month-to-month with a 3-day free trial and no contract.</p>',
      '<h2>Frequently asked questions</h2>',
      '<h3>What is the best lead generation tool for mortgage loan officers?</h3>',
      '<p>HomeListingAI is built specifically for loan officers. Rather than reselling the same internet leads to many LOs, it generates warm leads through agent partnerships — the loan officer gives agents a co-branded AI listing page, and every engaged buyer routes back to the LO. Plans start at $149/month with a 3-day free trial.</p>',
      '<h3>How do loan officers get referrals from real estate agents?</h3>',
      '<p>The most reliable way is to make the agent look good to their buyers. HomeListingAI gives the agent a free, AI-powered listing page with a 24/7 buyer chatbot and share kit, co-branded with the loan officer&rsquo;s name and NMLS #. The tool improves the agent&rsquo;s listings, which builds loyalty, while warm buyer leads route back to the loan officer.</p>',
      '<h3>Is there an AI chatbot for real estate listings?</h3>',
      '<p>Yes. HomeListingAI puts a 24/7 AI buyer chatbot on every listing page. It answers buyer questions about the property and financing, captures contact details, and routes warm leads in real time. Loan officers can upload their own compliance rules so the AI stays within their company&rsquo;s marketing guidelines.</p>',
      '</main>',
    ].join(''),
  },
  {
    route: '/blog',
    title: 'Blog | HomeListingAI — Lead Gen & Agent Partnerships for Loan Officers',
    description:
      'Tactics for mortgage loan officers: how to earn real estate agent referrals, generate warm buyer leads, run compliant AI marketing, and build partnerships that fill your pipeline in any market.',
    image: '/og-image.png',
    type: 'website',
    bodyHtml: [
      '<main>',
      '<h1>HomeListingAI Blog</h1>',
      '<p>Practical guidance for mortgage loan officers who want warm leads and durable real estate agent partnerships. We cover how loan officers earn agent referrals, turn listings into warm buyer leads, run compliant AI-powered marketing, and build a pipeline that holds up when rates rise.</p>',
      '<h2>What you will find here</h2>',
      '<ul>',
      '<li>How loan officers build agent partnerships that generate consistent referrals</li>',
      '<li>Turning listing pages into 24/7 warm-lead capture with an AI buyer chatbot</li>',
      '<li>Staying compliant: Fair Housing, rate-quote rules, and AI marketing guardrails</li>',
      '<li>Product updates and playbooks for the HomeListingAI platform</li>',
      '</ul>',
      '</main>',
    ].join(''),
    schema: [
      {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: 'HomeListingAI Blog',
        url: `${SITE_URL}/blog`,
        description:
          'Lead generation, agent-partnership, and compliant AI marketing guidance for mortgage loan officers.',
      },
    ],
  },
  {
    route: '/white-label',
    title: 'White Label & Brokerage Solutions | HomeListingAI',
    description:
      'A white-label AI lead platform for brokerages, mortgage teams, and offices: your own custom domain, full branding, loan officer management, and warm-lead capture across every agent listing.',
    image: '/og-image.png',
    type: 'website',
    bodyHtml: [
      '<main>',
      '<h1>White Label &amp; Brokerage Solutions</h1>',
      '<p>HomeListingAI offers a white-label version of its AI lead-generation platform for brokerages, mortgage teams, and offices that want to own their tech stack. Run the entire experience under your own brand and custom domain, with centralized control over your loan officers and agent partners.</p>',
      '<h2>What white label includes</h2>',
      '<ul>',
      '<li><strong>Your brand, your domain:</strong> a fully rebranded platform on a custom domain, not a third-party tool</li>',
      '<li><strong>Office &amp; team management:</strong> invite and manage loan officers, track performance, and oversee agent partnerships from one dashboard</li>',
      '<li><strong>Warm-lead capture at scale:</strong> every agent listing gets an AI buyer chatbot and share kit, with leads routed to the right loan officer automatically</li>',
      '<li><strong>Compliance guardrails:</strong> platform rules are always on, and your team can upload company-specific compliance guidelines the AI must follow</li>',
      '</ul>',
      '<h2>Who it is for</h2>',
      '<p>Mortgage branch managers, brokerage owners, and team leads who want a branded lead-generation and agent-partnership engine for their loan officers — with transparent partnership pricing and no per-seat surprises.</p>',
      '</main>',
    ].join(''),
    schema: [
      {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: 'HomeListingAI White Label',
        serviceType: 'White-label AI lead generation platform for mortgage brokerages and teams',
        provider: { '@type': 'Organization', name: 'HomeListingAI', url: SITE_URL },
        areaServed: 'US',
        description:
          'A fully branded, custom-domain AI lead-generation and agent-partnership platform for mortgage brokerages, offices, and teams.',
      },
    ],
  },
  {
    route: '/compliance',
    title: 'Compliance & Responsible AI Use | HomeListingAI',
    description:
      'How HomeListingAI supports compliant mortgage marketing: always-on platform guardrails (no legal advice, no rate guarantees, Fair Housing), plus loan-officer-uploaded company compliance rules enforced across every AI response.',
    image: '/og-image.png',
    type: 'website',
    bodyHtml: [
      '<main>',
      '<h1>Compliance &amp; Responsible AI Use</h1>',
      '<p>HomeListingAI is built for a regulated industry. The platform applies always-on compliance guardrails to every AI response and every piece of AI-generated marketing, and lets each loan officer layer their own company&rsquo;s compliance rules on top.</p>',
      '<h2>Always-on platform guardrails</h2>',
      '<ul>',
      '<li>Never provides legal advice; directs users to a qualified attorney</li>',
      '<li>Never guesses — defers to the loan officer or real estate agent when unsure</li>',
      '<li>Never quotes specific interest rates or APRs unless the loan officer provided them</li>',
      '<li>Enforces Fair Housing Act protections — no discrimination on protected classes</li>',
      '<li>Never guarantees loan approval, closing timelines, or specific terms</li>',
      '</ul>',
      '<h2>Your company&rsquo;s compliance rules</h2>',
      '<p>Loan officers can upload a compliance document from their company&rsquo;s compliance officer. Those rules are enforced as hard constraints in every buyer chat and every piece of marketing the AI generates — on top of the platform guardrails above.</p>',
      '<p>HomeListingAI provides compliance support tools. Loan officers, agents, and their companies remain responsible for final review and regulatory compliance.</p>',
      '</main>',
    ].join(''),
  },
  {
    route: '/dmca',
    title: 'DMCA Policy | HomeListingAI',
    description: 'HomeListingAI DMCA policy and reporting process.',
    image: '/og-image.png',
    type: 'website',
    bodyHtml: '<main><h1>DMCA Policy</h1><p>DMCA reporting information for HomeListingAI.</p></main>',
  },
];

const POLICY_PAGES = [
  { route: '/privacy-policy', source: path.join(ROOT_DIR, 'public', 'privacy-policy.html') },
  { route: '/terms-of-service', source: path.join(ROOT_DIR, 'public', 'terms-of-service.html') },
  { route: '/refund-policy', source: path.join(ROOT_DIR, 'public', 'refund-policy.html') },
];

const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

const truncate = (value, max = 160) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length <= max ? text : `${text.slice(0, max - 1).trim()}…`;
};

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toAbsoluteUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('data:')) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${SITE_URL}${raw.startsWith('/') ? raw : `/${raw}`}`;
};

const toSocialImage = (value) => toAbsoluteUrl(value) || DEFAULT_IMAGE;

const stripHtml = (value) =>
  String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const extractListingDescription = (descriptionValue) => {
  if (typeof descriptionValue === 'string') return stripHtml(descriptionValue);
  if (descriptionValue && typeof descriptionValue === 'object') {
    const title = typeof descriptionValue.title === 'string' ? descriptionValue.title.trim() : '';
    const paragraphValues = Array.isArray(descriptionValue.paragraphs)
      ? descriptionValue.paragraphs.filter((item) => typeof item === 'string' && item.trim().length > 0)
      : [];
    return stripHtml([title, ...paragraphValues].filter(Boolean).join(' '));
  }
  return '';
};

const isListingPublished = (listing) => {
  const normalized = String(listing?.status || '').trim().toLowerCase();
  return normalized === 'published' || normalized === 'active' || normalized === 'sold' || Boolean(listing?.is_published);
};

const slugify = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const setTag = (html, pattern, replacement, fallback) => {
  if (pattern.test(html)) {
    return html.replace(pattern, replacement);
  }
  return html.replace('</head>', `  ${fallback}\n</head>`);
};

const setMetaByName = (html, name, content) => {
  const tag = `<meta name="${name}" content="${escapeHtml(content)}" />`;
  return setTag(
    html,
    new RegExp(`<meta\\s+[^>]*name=["']${escapeRegex(name)}["'][^>]*>`, 'i'),
    tag,
    tag
  );
};

const setMetaByProperty = (html, property, content) => {
  const tag = `<meta property="${property}" content="${escapeHtml(content)}" />`;
  return setTag(
    html,
    new RegExp(`<meta\\s+[^>]*property=["']${escapeRegex(property)}["'][^>]*>`, 'i'),
    tag,
    tag
  );
};

const setCanonical = (html, href) => {
  const tag = `<link rel="canonical" href="${escapeHtml(href)}" />`;
  return setTag(
    html,
    /<link\s+[^>]*rel=["']canonical["'][^>]*>/i,
    tag,
    tag
  );
};

const setJsonLd = (html, schemaItems) => {
  const withoutJsonLd = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/g, '');
  if (!schemaItems || schemaItems.length === 0) return withoutJsonLd;
  const scripts = schemaItems
    .map((item) => `  <script type="application/ld+json">\n${JSON.stringify(item, null, 2)}\n  </script>`)
    .join('\n');
  return withoutJsonLd.replace('</head>', `${scripts}\n</head>`);
};

const setRootFallback = (html, fallbackHtml) => {
  if (!fallbackHtml) return html;
  return html.replace(/<div id="root"><\/div>/i, `<div id="root">${fallbackHtml}</div>`);
};

const renderHtml = (template, page) => {
  const canonicalUrl = toAbsoluteUrl(page.route);
  const socialImage = toSocialImage(page.image);
  let html = template;

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(page.title)}</title>`);
  html = setMetaByName(html, 'title', page.title);
  html = setMetaByName(html, 'description', page.description);
  html = setMetaByName(html, 'robots', page.robots || 'index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1');
  html = setCanonical(html, canonicalUrl);
  html = setMetaByProperty(html, 'og:site_name', 'HomeListingAI');
  html = setMetaByProperty(html, 'og:type', page.type || 'website');
  html = setMetaByProperty(html, 'og:url', canonicalUrl);
  html = setMetaByProperty(html, 'og:title', page.title);
  html = setMetaByProperty(html, 'og:description', page.description);
  html = setMetaByProperty(html, 'og:image', socialImage);
  html = setMetaByName(html, 'twitter:card', 'summary_large_image');
  html = setMetaByName(html, 'twitter:url', canonicalUrl);
  html = setMetaByName(html, 'twitter:title', page.title);
  html = setMetaByName(html, 'twitter:description', page.description);
  html = setMetaByName(html, 'twitter:image', socialImage);
  // preserveJsonLd: keep the rich JSON-LD already baked into index.html (single source
  // of truth for the landing page schema) instead of stripping + replacing it.
  if (!page.preserveJsonLd) {
    html = setJsonLd(html, page.schema || []);
  }
  html = setRootFallback(html, page.bodyHtml || '');
  return html;
};

const writeRouteFile = async (route, html) => {
  if (route === '/') {
    await fs.writeFile(INDEX_PATH, html, 'utf8');
    return;
  }

  const trimmed = route.replace(/^\/+/, '').replace(/\/+$/, '');
  const targetDir = path.join(DIST_DIR, trimmed);
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(path.join(targetDir, 'index.html'), html, 'utf8');
};

const copyPolicyPage = async (route, sourcePath) => {
  const html = await fs.readFile(sourcePath, 'utf8');
  const canonicalUrl = toAbsoluteUrl(route);
  let output = html;
  output = setCanonical(output, canonicalUrl);
  output = setMetaByName(output, 'robots', 'index,follow');
  await writeRouteFile(route, output);
};

const fetchBlogPosts = async () => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('slug,title,excerpt,content,featured_image,featured_image_alt,seo_title,seo_description,published_at,updated_at,status')
      .eq('status', 'published')
      .order('published_at', { ascending: false });
    if (error) throw error;
    return Array.isArray(data) ? data.filter((post) => post.slug) : [];
  } catch (error) {
    console.warn('[seo] Failed to fetch blog posts:', error?.message || error);
    return [];
  }
};

const fetchListings = async () => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return Array.isArray(data)
      ? data.filter((listing) => isListingPublished(listing) && String(listing.public_slug || '').trim())
      : [];
  } catch (error) {
    console.warn('[seo] Failed to fetch public listings:', error?.message || error);
    return [];
  }
};

const buildBlogPage = (post) => {
  const slug = slugify(post.slug);
  const title = truncate(post.seo_title || post.title || 'Blog Post', 70);
  const description = truncate(post.seo_description || post.excerpt || stripHtml(post.content), 160);
  const image = post.featured_image || '/og-image.png';
  const canonicalPath = `/blog/${slug}`;
  const bodyHtml = `<main><article><h1>${escapeHtml(post.title || title)}</h1><p>${escapeHtml(
    post.excerpt || description
  )}</p></article></main>`;

  return {
    route: canonicalPath,
    title,
    description,
    image,
    type: 'article',
    bodyHtml,
    schema: [
      {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.seo_title || post.title || 'HomeListingAI Blog',
        description,
        image: toSocialImage(image),
        url: `${SITE_URL}${canonicalPath}`,
        datePublished: post.published_at || null,
        dateModified: post.updated_at || post.published_at || null,
        author: {
          '@type': 'Organization',
          name: 'HomeListingAI',
        },
        publisher: {
          '@type': 'Organization',
          name: 'HomeListingAI',
          logo: {
            '@type': 'ImageObject',
            url: `${SITE_URL}/newlogo.png`,
          },
        },
      },
    ],
    lastmod: post.updated_at || post.published_at || null,
  };
};

const buildListingPage = (listing) => {
  const publicSlug = String(listing.public_slug || '').trim();
  const titleBase = String(listing.title || listing.address || 'Listing').trim();
  const address = String(listing.address || '').trim();
  const title = truncate(address ? `${address} | HomeListingAI` : `${titleBase} | HomeListingAI`, 70);
  const descriptionSource = extractListingDescription(listing.description);
  const price = Number(listing.price || 0);
  const beds = Number(listing.beds ?? listing.bedrooms ?? 0);
  const baths = Number(listing.baths ?? listing.bathrooms ?? 0);
  const sqft = Number(listing.sqft ?? listing.squareFeet ?? 0);
  const summaryBits = [
    price > 0 ? `$${price.toLocaleString('en-US')}` : '',
    beds > 0 ? `${beds} bed` : '',
    baths > 0 ? `${baths} bath` : '',
    sqft > 0 ? `${sqft.toLocaleString('en-US')} sq ft` : '',
  ].filter(Boolean);
  const description = truncate(
    descriptionSource ||
      [titleBase, address, summaryBits.join(', ')].filter(Boolean).join('. ') ||
      'View this HomeListingAI property page.',
    160
  );
  const image =
    (Array.isArray(listing.hero_photos) && listing.hero_photos.find((value) => typeof value === 'string' && value.trim())) ||
    (Array.isArray(listing.gallery_photos) && listing.gallery_photos.find((value) => typeof value === 'string' && value.trim())) ||
    '/og-image.png';
  const canonicalPath = `/l/${encodeURIComponent(publicSlug)}`;

  return {
    route: canonicalPath,
    title,
    description,
    image,
    type: 'website',
    bodyHtml: `<main><article><h1>${escapeHtml(titleBase || address || 'Property Listing')}</h1><p>${escapeHtml(
      [address, summaryBits.join(' | '), descriptionSource].filter(Boolean).join(' - ') || description
    )}</p></article></main>`,
    schema: [
      {
        '@context': 'https://schema.org',
        '@type': ['SingleFamilyResidence', 'RealEstateListing'],
        name: titleBase || address || 'Property Listing',
        description,
        url: `${SITE_URL}${canonicalPath}`,
        image: toSocialImage(image),
        address: address || undefined,
        numberOfRooms: beds || undefined,
        numberOfBathroomsTotal: baths || undefined,
        floorSize: sqft
          ? {
              '@type': 'QuantitativeValue',
              value: sqft,
              unitCode: 'FTK',
            }
          : undefined,
        offers: price
          ? {
              '@type': 'Offer',
              price,
              priceCurrency: 'USD',
              availability: 'https://schema.org/InStock',
            }
          : undefined,
      },
    ],
    lastmod: listing.updated_at || listing.published_at || null,
  };
};

const buildSitemap = (pages) => {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
  for (const page of pages) {
    const loc = `${SITE_URL}${page.route === '/' ? '/' : page.route}`;
    lines.push('  <url>');
    lines.push(`    <loc>${escapeHtml(loc)}</loc>`);
    if (page.lastmod) {
      lines.push(`    <lastmod>${escapeHtml(new Date(page.lastmod).toISOString())}</lastmod>`);
    }
    lines.push(`    <changefreq>${page.changefreq || 'weekly'}</changefreq>`);
    lines.push(`    <priority>${page.priority || (page.route === '/' ? '1.0' : '0.7')}</priority>`);
    lines.push('  </url>');
  }
  lines.push('</urlset>');
  return `${lines.join('\n')}\n`;
};

const main = async () => {
  const baseTemplate = (await fs.readFile(INDEX_PATH, 'utf8')).replace(
    /<div id="root">[\s\S]*?<\/div>/i,
    '<div id="root"></div>'
  );
  const blogPosts = await fetchBlogPosts();
  const listings = await fetchListings();

  const generatedPages = [
    ...STATIC_ROUTES.map((page) => ({ ...page, lastmod: null, changefreq: page.route === '/' ? 'weekly' : 'monthly' })),
    ...blogPosts.map(buildBlogPage).map((page) => ({ ...page, changefreq: 'weekly', priority: '0.8' })),
    ...listings.map(buildListingPage).map((page) => ({ ...page, changefreq: 'daily', priority: '0.8' })),
    ...POLICY_PAGES.map((page) => ({ ...page, lastmod: null, changefreq: 'monthly', priority: '0.5' })),
  ];

  for (const page of STATIC_ROUTES) {
    const html = renderHtml(baseTemplate, page);
    await writeRouteFile(page.route, html);
  }

  for (const post of blogPosts) {
    const page = buildBlogPage(post);
    const html = renderHtml(baseTemplate, page);
    await writeRouteFile(page.route, html);
  }

  for (const listing of listings) {
    const page = buildListingPage(listing);
    const html = renderHtml(baseTemplate, page);
    await writeRouteFile(page.route, html);
  }

  for (const page of POLICY_PAGES) {
    await copyPolicyPage(page.route, page.source);
  }

  await fs.writeFile(path.join(DIST_DIR, 'sitemap.xml'), buildSitemap(generatedPages), 'utf8');
  console.log(
    `[seo] Generated ${STATIC_ROUTES.length} static pages, ${blogPosts.length} blog pages, ${listings.length} listing pages, and sitemap.xml`
  );
};

main().catch((error) => {
  console.error('[seo] Failed to generate SEO pages:', error);
  process.exitCode = 1;
});
