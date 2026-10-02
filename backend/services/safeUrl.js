'use strict';

// SSRF guard: any server-side fetch of a URL a user typed must go through safeFetch().
// It refuses non-http(s), localhost, private / link-local / carrier-grade NAT ranges, and
// re-checks every redirect hop. (A DNS lookup is done before each request; a hostile DNS
// server could still change its answer between lookup and connect, which is acceptable here.)

const dns = require('dns').promises;
const net = require('net');

function isPrivateIpv4(ip) {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIp(ip) {
  const addr = String(ip || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (net.isIPv4(addr)) return isPrivateIpv4(addr);
  if (net.isIPv6(addr)) {
    if (addr === '::' || addr === '::1') return true;
    const mapped = addr.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIpv4(mapped[1]);
    const first = parseInt(addr.split(':')[0] || '0', 16);
    if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
    if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link local
    return false;
  }
  return true; // not an IP at all: treat as unsafe
}

async function assertPublicHttpUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { throw new Error('url_not_allowed'); }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('url_not_allowed');
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) {
    throw new Error('url_not_allowed');
  }
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error('url_not_allowed');
    return url.toString();
  }
  let records;
  try { records = await dns.lookup(host, { all: true }); } catch { throw new Error('url_not_allowed'); }
  if (!records.length || records.some((r) => isPrivateIp(r.address))) throw new Error('url_not_allowed');
  return url.toString();
}

async function safeFetch(raw, options = {}, maxRedirects = 3, fetchImpl = fetch) {
  let current = raw;
  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    await assertPublicHttpUrl(current);
    const res = await fetchImpl(current, { ...options, redirect: 'manual' });
    const location = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null;
    if (!location) return res;
    current = new URL(location, current).toString();
  }
  throw new Error('url_not_allowed');
}

module.exports = { isPrivateIp, assertPublicHttpUrl, safeFetch };
