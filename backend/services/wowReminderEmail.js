// Reminder + follow-up email for a WOW link the agent has not claimed yet.
// Same look as the first invite (buildWowLinkEmail in server.cjs): light, email-safe
// tables, inline CSS, system fonts. One builder serves both the manual "nudge" and the
// automatic follow-up so they never drift apart again.

const esc = (v) =>
  String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const FONT = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',Helvetica,Arial,sans-serif";
const BLUE = '#1d4ed8';

const buildWowReminderEmail = ({ name, loName, loCompany, nmls, wowLink, kind = 'nudge', siteBase = 'https://homelistingai.com' }) => {
  const hasName = Boolean(String(name || '').trim());
  const greet = esc(hasName ? String(name).trim().split(' ')[0] : 'there');
  const loFull = esc(loName || 'Your loan officer');
  const loFirst = esc(String(loName || '').split(' ')[0] || 'Your loan officer');
  const company = loCompany ? esc(loCompany) : '';

  const headline = kind === 'followup'
    ? `${loFirst} saved your listing demo`
    : `${loFirst} is still holding your listing demo`;
  const intro = kind === 'followup'
    ? `I set up a live assistant for your listing a few days ago. It answers buyer questions around the clock and quietly flags the serious ones. Here is the link again in case it got buried.`
    : `${loFirst} built a live assistant for your listing. It answers buyer questions around the clock and quietly flags the serious ones. It takes about 30 seconds to try.`;

  const subject = kind === 'followup'
    ? `Still want to see your listing demo, ${hasName ? String(name).trim().split(' ')[0] : 'there'}?`
    : `${loName || 'Your loan officer'} still has your listing demo`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${headline}</title></head>
<body style="margin:0;padding:0;background:#f2f2f7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your listing demo is ready. Try it in 30 seconds. No signup.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f7;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:20px;">
<tr><td style="padding:32px 28px 8px;">
  <div style="font:800 12px/1.3 ${FONT};letter-spacing:1.5px;color:${BLUE};">YOUR LISTING DEMO IS READY</div>
  <div style="font:800 26px/1.2 ${FONT};color:#1c1c1e;padding:6px 0 8px;">Hi ${greet}, ${headline}.</div>
  <div style="font:400 14px/1.4 ${FONT};color:#6c6c70;">From ${loFull}${company ? ` &middot; ${company}` : ''}</div>
</td></tr>
<tr><td style="padding:12px 28px 4px;">
  <div style="font:400 16px/1.55 ${FONT};color:#1c1c1e;">${intro}</div>
</td></tr>
<tr><td align="center" style="padding:20px 28px 8px;">
  <a href="${esc(wowLink)}" style="display:inline-block;background:${BLUE};color:#ffffff;font:700 16px/1 ${FONT};text-decoration:none;padding:16px 34px;border-radius:14px;">See my listing demo</a>
</td></tr>
<tr><td align="center" style="padding:4px 28px 24px;">
  <div style="font:400 13px/1.4 ${FONT};color:#6c6c70;">No signup &middot; Takes 30 seconds &middot; Built by ${loFull}</div>
</td></tr>
<tr><td style="padding:16px 28px 24px;border-top:1px solid #e5e5ea;">
  <div style="font:400 11px/1.5 ${FONT};color:#8e8e93;">${loFull}${nmls ? `, NMLS #${esc(nmls)}` : ''}. Not a commitment to lend. Sent through <a href="${siteBase}" style="color:#8e8e93;">HomeListingAI</a>.</div>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  return { subject, html };
};

module.exports = { buildWowReminderEmail };
