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
    title: 'HomeListingAI | Turn Listings Into Leads Automatically',
    description:
      'Turn every listing into a 24/7 lead machine. AI listing pages, market reports, and fast lead capture for real estate agents.',
    image: '/og-image.png',
    type: 'website',
    bodyHtml:
      '<main><h1>Turn Listings Into Leads Automatically</h1><p>HomeListingAI helps real estate agents publish AI-powered listing pages, capture leads, and manage follow-up from one dashboard.</p></main>',
    schema: [
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'HomeListingAI',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: SITE_URL,
        description:
          'HomeListingAI helps real estate agents turn listings into AI-powered lead capture pages and follow-up workflows.',
      },
    ],
  },
  {
    route: '/blog',
    title: 'Blog | HomeListingAI',
    description:
      'Real estate marketing tips, AI listing advice, and product updates for agents using HomeListingAI.',
    image: '/og-image.png',
    type: 'website',
    bodyHtml:
      '<main><h1>HomeListingAI Blog</h1><p>Insights, AI tips, and product updates for real estate agents.</p></main>',
    schema: [
      {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: 'HomeListingAI Blog',
        url: `${SITE_URL}/blog`,
        description:
          'Real estate marketing tips, AI listing advice, and product updates for HomeListingAI users.',
      },
    ],
  },
  {
    route: '/white-label',
    title: 'White Label Solutions | HomeListingAI',
    description:
      'Custom AI real estate platforms for brokerages and teams that want a branded lead capture and automation experience.',
    image: '/og-image.png',
    type: 'website',
    bodyHtml:
      '<main><h1>White Label Solutions</h1><p>Custom AI real estate platforms for brokerages and teams.</p></main>',
  },
  {
    route: '/compliance',
    title: 'Compliance Policy | HomeListingAI',
    description: 'HomeListingAI compliance policy and responsible use information.',
    image: '/og-image.png',
    type: 'website',
    bodyHtml: '<main><h1>Compliance Policy</h1><p>Compliance and responsible use information for HomeListingAI.</p></main>',
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
  html = setJsonLd(html, page.schema || []);
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
