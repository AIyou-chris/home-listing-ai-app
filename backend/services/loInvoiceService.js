'use strict';

// Loan officer -> agent invoices. HomeListingAI only creates, sends and tracks the invoice.
// It never takes, holds or moves money: the agent pays the loan officer directly, however they
// agree. No Express, no database in this file so it can be tested on its own.

const MAX_LINES = 20;
const MAX_LINE_CENTS = 10_000_000; // $100,000 per line
const MAX_TOTAL_CENTS = 100_000_000; // $1,000,000 per invoice
const MAX_DESC = 160;
const MAX_NOTE = 1000;
const MAX_INSTRUCTIONS = 1000;
const REMINDER_GAP_MS = 24 * 60 * 60 * 1000;
const MAX_REMINDERS = 5;

const DISCLAIMER =
  'This invoice is issued by the loan officer named above. HomeListingAI provides the tool used to create it ' +
  'and is not a party to any payment between the loan officer and the recipient.';

const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/;

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// "125", "125.5", "$1,250.00" -> cents. Returns null for anything that is not a positive money amount.
function toCents(value) {
  if (value === null || value === undefined || value === '') return null;
  const cleaned = String(value).replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const cents = Math.round(Number.parseFloat(cleaned) * 100);
  return Number.isFinite(cents) && cents > 0 ? cents : null;
}

function formatMoney(cents) {
  const n = Number(cents || 0) / 100;
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function cleanText(value, max) {
  return String(value ?? '').replace(/\r\n/g, '\n').trim().slice(0, max);
}

// Validates the request body. Returns { error } or { value }.
function normalizeInvoiceInput(body = {}) {
  const agentEmail = cleanText(body.agentEmail ?? body.agent_email, 254).toLowerCase();
  if (!EMAIL_RE.test(agentEmail)) return { error: 'invalid_agent_email' };

  const rawLines = Array.isArray(body.lines ?? body.line_items) ? (body.lines ?? body.line_items) : [];
  if (rawLines.length === 0) return { error: 'lines_required' };
  if (rawLines.length > MAX_LINES) return { error: 'too_many_lines' };

  const lineItems = [];
  let totalCents = 0;
  for (const raw of rawLines) {
    const description = cleanText(raw?.description, MAX_DESC);
    if (!description) return { error: 'line_description_required' };
    const amountCents = toCents(raw?.amount ?? raw?.amount_dollars);
    if (!amountCents) return { error: 'invalid_line_amount' };
    if (amountCents > MAX_LINE_CENTS) return { error: 'line_amount_too_large' };
    lineItems.push({ description, amount_cents: amountCents });
    totalCents += amountCents;
  }
  if (totalCents > MAX_TOTAL_CENTS) return { error: 'invoice_total_too_large' };

  let dueDate = null;
  const rawDue = cleanText(body.dueDate ?? body.due_date, 10);
  if (rawDue) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDue) || Number.isNaN(Date.parse(`${rawDue}T00:00:00Z`))) return { error: 'invalid_due_date' };
    dueDate = rawDue;
  }

  return {
    value: {
      agentEmail,
      agentName: cleanText(body.agentName ?? body.agent_name, 120) || null,
      listingId: cleanText(body.listingId ?? body.listing_id, 64) || null,
      lineItems,
      totalCents,
      dueDate,
      paymentInstructions: cleanText(body.paymentInstructions ?? body.payment_instructions, MAX_INSTRUCTIONS) || null,
      note: cleanText(body.note, MAX_NOTE) || null
    }
  };
}

const formatInvoiceNumber = (n) => `INV-${String(Math.max(1, Number(n) || 1)).padStart(4, '0')}`;

// Can the loan officer nudge now? Only open invoices, at most daily, at most MAX_REMINDERS times.
function canSendReminder(invoice, now = Date.now()) {
  if (!invoice || invoice.status !== 'sent') return { ok: false, error: 'not_open' };
  if ((invoice.reminder_count || 0) >= MAX_REMINDERS) return { ok: false, error: 'reminder_limit_reached' };
  const last = new Date(invoice.last_reminder_at || invoice.sent_at || 0).getTime();
  if (Number.isFinite(last) && now - last < REMINDER_GAP_MS) return { ok: false, error: 'too_soon' };
  return { ok: true };
}

// "overdue" is derived, not stored: an open invoice past its due date.
function effectiveStatus(invoice, now = Date.now()) {
  if (invoice.status !== 'sent') return invoice.status;
  if (invoice.due_date && Date.parse(`${invoice.due_date}T23:59:59Z`) < now) return 'overdue';
  return 'sent';
}

function summarize(invoices, now = Date.now()) {
  let outstanding = 0;
  let overdue = 0;
  let paid = 0;
  for (const inv of invoices) {
    const status = effectiveStatus(inv, now);
    if (status === 'sent') outstanding += inv.total_cents;
    if (status === 'overdue') { outstanding += inv.total_cents; overdue += inv.total_cents; }
    if (status === 'paid') paid += inv.total_cents;
  }
  return { outstandingCents: outstanding, overdueCents: overdue, paidCents: paid };
}

// Cells starting with = + - @ run as formulas in Excel; defuse them (phone-looking values stay readable).
const PHONE_LIKE = /^[+-]?[\d\s().-]+$/;
function csvCell(value) {
  let s = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(s) && !PHONE_LIKE.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

function buildInvoicesCsv(invoices, now = Date.now()) {
  const header = ['Invoice', 'Agent', 'Agent email', 'Listing', 'Items', 'Total', 'Status', 'Sent', 'Due', 'Paid', 'Note'];
  const rows = invoices.map((inv) => [
    inv.invoice_number,
    inv.agent_name || '',
    inv.agent_email,
    inv.listing_address || '',
    (inv.line_items || []).map((l) => `${l.description} (${formatMoney(l.amount_cents)})`).join('; '),
    (inv.total_cents / 100).toFixed(2),
    effectiveStatus(inv, now),
    inv.sent_at ? String(inv.sent_at).slice(0, 10) : '',
    inv.due_date || '',
    inv.paid_at ? String(inv.paid_at).slice(0, 10) : '',
    inv.note || ''
  ]);
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
}

// Email: tables and inline CSS only, system fonts. All user text is escaped.
function buildInvoiceEmail({ invoice, link, isReminder = false }) {
  const lo = escapeHtml(invoice.lo_name || 'Your loan officer');
  const company = invoice.lo_company ? `${escapeHtml(invoice.lo_company)}` : '';
  const nmls = invoice.lo_nmls ? ` · NMLS ${escapeHtml(invoice.lo_nmls)}` : '';
  const rows = (invoice.line_items || [])
    .map((l) => `<tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#334155;">${escapeHtml(l.description)}</td><td align="right" style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#334155;white-space:nowrap;">${escapeHtml(formatMoney(l.amount_cents))}</td></tr>`)
    .join('');
  const due = invoice.due_date ? `<p style="margin:0 0 4px;font-size:14px;color:#475569;">Due: <strong>${escapeHtml(invoice.due_date)}</strong></p>` : '';
  const instructions = invoice.payment_instructions
    ? `<p style="margin:16px 0 4px;font-size:12px;font-weight:700;letter-spacing:.05em;color:#64748b;">HOW TO PAY</p><p style="margin:0;font-size:14px;color:#334155;white-space:pre-line;">${escapeHtml(invoice.payment_instructions)}</p>`
    : '';
  const note = invoice.note
    ? `<p style="margin:16px 0 4px;font-size:12px;font-weight:700;letter-spacing:.05em;color:#64748b;">NOTE</p><p style="margin:0;font-size:14px;color:#334155;white-space:pre-line;">${escapeHtml(invoice.note)}</p>`
    : '';
  const heading = isReminder ? `Reminder: invoice ${escapeHtml(invoice.invoice_number)}` : `Invoice ${escapeHtml(invoice.invoice_number)}`;
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f1f5f9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<tr><td>
<p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.05em;color:#64748b;">FROM YOUR LOAN OFFICER</p>
<p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#0f172a;">${lo}</p>
${company || nmls ? `<p style="margin:-12px 0 16px;font-size:13px;color:#64748b;">${company}${nmls}</p>` : ''}
<h1 style="margin:0 0 12px;font-size:20px;color:#0f172a;">${heading}</h1>
${invoice.listing_address ? `<p style="margin:0 0 4px;font-size:14px;color:#475569;">For: <strong>${escapeHtml(invoice.listing_address)}</strong></p>` : ''}
${due}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">${rows}
<tr><td style="padding:12px 0 0;font-size:15px;font-weight:700;color:#0f172a;">Total</td><td align="right" style="padding:12px 0 0;font-size:15px;font-weight:700;color:#0f172a;">${escapeHtml(formatMoney(invoice.total_cents))}</td></tr></table>
${instructions}${note}
<p style="margin:24px 0 0;"><a href="${escapeHtml(link)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:10px;">View invoice</a></p>
<p style="margin:20px 0 0;font-size:12px;color:#94a3b8;">${escapeHtml(DISCLAIMER)} Reply to this email to reach your loan officer.</p>
</td></tr></table></td></tr></table></body></html>`;
}

module.exports = {
  MAX_LINES,
  MAX_REMINDERS,
  REMINDER_GAP_MS,
  DISCLAIMER,
  escapeHtml,
  toCents,
  formatMoney,
  normalizeInvoiceInput,
  formatInvoiceNumber,
  canSendReminder,
  effectiveStatus,
  summarize,
  csvCell,
  buildInvoicesCsv,
  buildInvoiceEmail
};
