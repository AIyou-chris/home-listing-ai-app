// Adapted from ai-landing-template/server/lib/marketing/blog-render.cjs.
function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}

// JSON.stringify does not escape "<", so a title/field containing
// "</script>" can break out of the <script type="application/ld+json">
// block it's embedded in. Escaping to < (etc.) keeps the string
// valid JSON -- JSON.parse round-trips it back to the original
// character -- while making it inert as HTML markup.
function jsonLdSafe(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function breadcrumbJsonLd(post, siteOrigin, { basePath = '', homeHref = '/' } = {}) {
  return jsonLdSafe({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteOrigin}${homeHref}` },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${siteOrigin}${basePath}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: `${siteOrigin}${basePath}/blog/${post.slug}` }
    ]
  });
}


function rssItem(post, siteOrigin, basePath) {
  const link = `${siteOrigin}${basePath}/blog/${encodeURIComponent(post.slug)}`;
  return `<item>
<title>${escapeHtml(post.title)}</title>
<link>${escapeHtml(link)}</link>
<guid>${escapeHtml(link)}</guid>
<description>${escapeHtml(post.excerpt || post.meta_description || '')}</description>
<pubDate>${new Date(post.published_at).toUTCString()}</pubDate>
</item>`;
}

function renderRssXml(posts, { siteOrigin, basePath = '', siteName = 'HomeListingAI Field Notes' }) {
  const items = posts.map(post => rssItem(post, siteOrigin, basePath)).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>${escapeHtml(siteName)}</title>
<link>${siteOrigin}${basePath}/blog</link>
<description>Practical guides for mortgage loan officers.</description>
${items}
</channel>
</rss>`;
}


module.exports={escapeHtml,jsonLdSafe,breadcrumbJsonLd,renderRssXml};
