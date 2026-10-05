#!/usr/bin/env node
'use strict';

// Usage: node backend/scripts/check-cold-email-dns.cjs <sending-domain> [dkim-selector]
// Prints PASS/FAIL for SPF, DKIM, DMARC and MX (MX is needed so replies reach Mailgun).
const dns = require('dns').promises;

const txt = async (name) => {
  try { return (await dns.resolveTxt(name)).map((parts) => parts.join('')); } catch { return []; }
};

const checkSpf = (records) => {
  const spf = records.find((r) => /^v=spf1\b/i.test(r));
  if (!spf) return { ok: false, detail: 'No SPF record. Add: v=spf1 include:mailgun.org ~all' };
  if (!/include:mailgun\.org/i.test(spf)) return { ok: false, detail: `SPF exists but does not include mailgun.org: ${spf}` };
  return { ok: true, detail: spf };
};

const checkDmarc = (records) => {
  const d = records.find((r) => /^v=DMARC1\b/i.test(r));
  if (!d) return { ok: false, detail: 'No DMARC record. Add _dmarc TXT: v=DMARC1; p=none; rua=mailto:you@yourdomain.com' };
  return { ok: true, detail: d };
};

const checkDkim = (records) => {
  const k = records.find((r) => /v=DKIM1|k=rsa|p=MI/i.test(r));
  return k ? { ok: true, detail: `${k.slice(0, 60)}...` } : { ok: false, detail: 'No DKIM key at the selector. Copy the exact record from Mailgun > Domain settings > DNS records.' };
};

const main = async () => {
  const domain = (process.argv[2] || process.env.COLD_EMAIL_DOMAIN || '').toLowerCase();
  const selector = process.argv[3] || process.env.COLD_EMAIL_DKIM_SELECTOR || 'mailo';
  if (!domain) { console.error('Give the sending domain: node backend/scripts/check-cold-email-dns.cjs mail.example.com [dkim-selector]'); process.exit(2); }
  const product = ['homelistingai.com', 'mg.homelistingai.com'];
  const results = [];
  results.push(['Separate from product domain', { ok: !product.includes(domain), detail: product.includes(domain) ? 'Cold email must NOT use the product domain.' : domain }]);
  results.push(['SPF', checkSpf(await txt(domain))]);
  results.push([`DKIM (${selector}._domainkey)`, checkDkim(await txt(`${selector}._domainkey.${domain}`))]);
  results.push(['DMARC', checkDmarc(await txt(`_dmarc.${domain}`))]);
  let mx = [];
  try { mx = await dns.resolveMx(domain); } catch { /* none */ }
  results.push(['MX (replies)', { ok: mx.some((m) => /mailgun/i.test(m.exchange)), detail: mx.length ? mx.map((m) => m.exchange).join(', ') : 'No MX. Add the two Mailgun MX records so replies can be received.' }]);
  let failed = 0;
  for (const [name, r] of results) { console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${name}\n      ${r.detail}`); if (!r.ok) failed += 1; }
  console.log(failed ? `\n${failed} check(s) failed. Fix them before turning COLD_EMAIL_ENABLED on.` : '\nAll DNS checks passed.');
  process.exit(failed ? 1 : 0);
};

if (require.main === module) main();
module.exports = { checkSpf, checkDmarc, checkDkim };
