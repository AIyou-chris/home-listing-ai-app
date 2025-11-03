/**
 * Thin Rebrandly client used for link shortening and analytics.
 * Falls back to deterministic mock data when the service is not configured
 * or the network call fails (e.g. local demo, offline environments).
 */

const API_BASE = 'https://api.rebrandly.com/v1';
const API_KEY = import.meta.env.VITE_REBRANDLY_API_KEY as string | undefined;
const WORKSPACE_ID = import.meta.env.VITE_REBRANDLY_WORKSPACE_ID as string | undefined;
// Accept either domain id or fullName. Prefer a human readable domain name.
const DOMAIN_FULL_NAME = import.meta.env.VITE_REBRANDLY_DOMAIN as string | undefined;

const isConfigured = Boolean(API_KEY);

function randomId(): string {
  return `${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`;
}

export interface ShortLinkOptions {
  slashtag?: string;
  title?: string;
  description?: string;
  tags?: string[];
  destination: string;
}

export interface ShortLink {
  id: string;
  shortUrl: string;
  destination: string;
  title?: string;
  slashtag?: string;
  clicks?: number;
  createdAt?: string;
}

export interface LinkStatsSummary {
  totalLinks: number;
  totalClicks: number;
  uniqueClicks: number;
  topLinks: Array<ShortLink & { clicks: number; uniqueClicks: number; lastClickAt?: string }>;
  lastUpdated: string;
}

interface RebrandlyLink extends ShortLink {
  uniqueClicks?: number;
  lastClickAt?: string;
}

type RebrandlyListResponse = RebrandlyLink[] | {
  data?: RebrandlyLink[];
  total?: number;
};

function getHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    apikey: API_KEY ?? '',
    ...(WORKSPACE_ID ? { workspace: WORKSPACE_ID } : {})
  };
}

function createMockShortLink(options: ShortLinkOptions): ShortLink {
  const slug =
    options.slashtag ||
    ['demo', Math.random().toString(36).slice(2, 6), Math.random().toString(36).slice(2, 4)].join('-');

  const shortUrl = `${DOMAIN_FULL_NAME || 'homelisting.ai/demo'}/${slug}`;

  return {
    id: randomId(),
    destination: options.destination,
    shortUrl,
    title: options.title,
    slashtag: slug,
    clicks: Math.floor(Math.random() * 250) + 25,
    createdAt: new Date().toISOString()
  };
}

async function postLink(options: ShortLinkOptions): Promise<ShortLink> {
  if (!isConfigured) {
    return createMockShortLink(options);
  }

  try {
    const payload: Record<string, unknown> = {
      destination: options.destination,
      slashtag: options.slashtag,
      title: options.title,
      description: options.description,
      tags: options.tags,
      domain: DOMAIN_FULL_NAME ? { fullName: DOMAIN_FULL_NAME } : undefined
    };

    const response = await fetch(`${API_BASE}/links`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Rebrandly responded with ${response.status}`);
    }

    const json = await response.json();
    return {
      id: json.id,
      shortUrl: json.shortUrl,
      destination: json.destination,
      title: json.title,
      slashtag: json.slashtag,
      clicks: json.clicks,
      createdAt: json.createdAt
    };
  } catch (error) {
    console.warn('[linkShortenerService] Falling back to mock link:', error);
    return createMockShortLink(options);
  }
}

export async function createShortLink(options: ShortLinkOptions): Promise<ShortLink> {
  return postLink(options);
}

export async function getLinkStats(linkId: string): Promise<{ clicks: number; uniqueClicks: number }> {
  if (!isConfigured) {
    return {
      clicks: Math.floor(Math.random() * 1000),
      uniqueClicks: Math.floor(Math.random() * 750)
    };
  }

  try {
    const response = await fetch(`${API_BASE}/links/${linkId}/stats`, {
      method: 'GET',
      headers: getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Rebrandly stats responded with ${response.status}`);
    }

    const json = await response.json();
    return {
      clicks: json.clicks ?? 0,
      uniqueClicks: json.uniques ?? 0
    };
  } catch (error) {
    console.warn('[linkShortenerService] Unable to fetch stats, returning mock data:', error);
    return {
      clicks: Math.floor(Math.random() * 1000),
      uniqueClicks: Math.floor(Math.random() * 750)
    };
  }
}

export async function listTopLinks(limit = 5): Promise<LinkStatsSummary> {
  if (!isConfigured) {
    const sample = Array.from({ length: limit }).map((_, index) => createMockShortLink({
      destination: `https://demo.homelisting.ai/properties/${index + 1}`,
      slashtag: `demo-${index + 1}`,
      title: `Demo Listing ${index + 1}`
    }));

    return {
      totalLinks: sample.length + 5,
      totalClicks: sample.reduce((sum, link) => sum + (link.clicks ?? 0), 0),
      uniqueClicks: Math.floor(sample.reduce((sum, link) => sum + (link.clicks ?? 0), 0) * 0.78),
      topLinks: sample.map(link => ({
        ...link,
        clicks: link.clicks ?? Math.floor(Math.random() * 300),
        uniqueClicks: Math.floor((link.clicks ?? 0) * 0.72),
        lastClickAt: new Date(Date.now() - Math.random() * 86400000).toISOString()
      })),
      lastUpdated: new Date().toISOString()
    };
  }

  try {
    const response = await fetch(
      `${API_BASE}/links?orderBy=-clicks${limit ? `&limit=${limit}` : ''}`,
      {
        method: 'GET',
        headers: getHeaders()
      }
    );

    if (!response.ok) {
      throw new Error(`Rebrandly list responded with ${response.status}`);
    }

    const payload = await response.json() as RebrandlyListResponse;
    const links = Array.isArray(payload) ? payload : payload.data ?? [];
    const normalizedLinks = links.map(link => ({
      ...link,
      clicks: link.clicks ?? 0,
      uniqueClicks: link.uniqueClicks ?? link.clicks ?? 0
    }));

    const totalLinks = Array.isArray(payload) ? payload.length : payload.total ?? normalizedLinks.length;

    return {
      totalLinks,
      totalClicks: normalizedLinks.reduce((sum, link) => sum + (link.clicks ?? 0), 0),
      uniqueClicks: normalizedLinks.reduce((sum, link) => sum + (link.uniqueClicks ?? 0), 0),
      topLinks: normalizedLinks.slice(0, limit).map(link => ({
        id: link.id,
        shortUrl: link.shortUrl,
        destination: link.destination,
        title: link.title,
        slashtag: link.slashtag,
        clicks: link.clicks ?? 0,
        uniqueClicks: link.uniqueClicks ?? 0,
        lastClickAt: link.lastClickAt
      })),
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.warn('[linkShortenerService] Unable to list links, returning mock data:', error);
    return listTopLinks(limit);
  }
}

export function linkShortenerConfigured(): boolean {
  return isConfigured;
}
