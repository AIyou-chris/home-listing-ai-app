'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const svc = require('../loInvoiceService');

const base = {
  agentEmail: 'Agent@Example.com',
  lines: [{ description: 'Share of flyer printing', amount: '125.50' }, { description: 'Share of social ads', amount: 74.5 }]
};

test('money strings become whole cents and bad values are rejected', () => {
  assert.equal(svc.toCents('125'), 12500);
  assert.equal(svc.toCents('$1,250.50'), 125050);
  assert.equal(svc.toCents(0.1), 10);
  assert.equal(svc.toCents('0'), null);
  assert.equal(svc.toCents('-5'), null);
  assert.equal(svc.toCents('1.234'), null);
  assert.equal(svc.toCents('abc'), null);
  assert.equal(svc.toCents(''), null);
});

test('a good invoice is normalized and totalled', () => {
  const { value, error } = svc.normalizeInvoiceInput({ ...base, dueDate: '2026-11-01', note: ' thanks ' });
  assert.equal(error, undefined);
  assert.equal(value.agentEmail, 'agent@example.com');
  assert.equal(value.totalCents, 20000);
  assert.equal(value.lineItems.length, 2);
  assert.equal(value.dueDate, '2026-11-01');
  assert.equal(value.note, 'thanks');
});

test('bad input is refused with a specific code', () => {
  assert.equal(svc.normalizeInvoiceInput({ ...base, agentEmail: 'nope' }).error, 'invalid_agent_email');
  assert.equal(svc.normalizeInvoiceInput({ agentEmail: 'a@b.com', lines: [] }).error, 'lines_required');
  assert.equal(svc.normalizeInvoiceInput({ agentEmail: 'a@b.com', lines: [{ description: '', amount: 5 }] }).error, 'line_description_required');
  assert.equal(svc.normalizeInvoiceInput({ agentEmail: 'a@b.com', lines: [{ description: 'x', amount: 0 }] }).error, 'invalid_line_amount');
  assert.equal(svc.normalizeInvoiceInput({ agentEmail: 'a@b.com', lines: [{ description: 'x', amount: 200000 }] }).error, 'line_amount_too_large');
  assert.equal(svc.normalizeInvoiceInput({ ...base, dueDate: 'tomorrow' }).error, 'invalid_due_date');
  const many = Array.from({ length: 21 }, () => ({ description: 'x', amount: 1 }));
  assert.equal(svc.normalizeInvoiceInput({ agentEmail: 'a@b.com', lines: many }).error, 'too_many_lines');
});

test('invoice numbers are padded', () => {
  assert.equal(svc.formatInvoiceNumber(1), 'INV-0001');
  assert.equal(svc.formatInvoiceNumber(42), 'INV-0042');
});

test('reminders: only open invoices, once a day, five at most', () => {
  const now = Date.parse('2026-10-10T12:00:00Z');
  const open = { status: 'sent', sent_at: '2026-10-08T12:00:00Z', reminder_count: 0 };
  assert.equal(svc.canSendReminder(open, now).ok, true);
  assert.equal(svc.canSendReminder({ ...open, sent_at: '2026-10-10T08:00:00Z' }, now).error, 'too_soon');
  assert.equal(svc.canSendReminder({ ...open, last_reminder_at: '2026-10-10T01:00:00Z' }, now).error, 'too_soon');
  assert.equal(svc.canSendReminder({ ...open, reminder_count: 5 }, now).error, 'reminder_limit_reached');
  assert.equal(svc.canSendReminder({ ...open, status: 'paid' }, now).error, 'not_open');
  assert.equal(svc.canSendReminder({ ...open, status: 'void' }, now).error, 'not_open');
});

test('overdue is worked out from the due date, and totals follow', () => {
  const now = Date.parse('2026-10-10T12:00:00Z');
  const invoices = [
    { status: 'sent', due_date: '2026-10-01', total_cents: 1000 },
    { status: 'sent', due_date: '2026-11-01', total_cents: 2000 },
    { status: 'sent', due_date: null, total_cents: 500 },
    { status: 'paid', total_cents: 4000 },
    { status: 'void', total_cents: 9999 }
  ];
  assert.equal(svc.effectiveStatus(invoices[0], now), 'overdue');
  assert.equal(svc.effectiveStatus(invoices[1], now), 'sent');
  assert.deepEqual(svc.summarize(invoices, now), { outstandingCents: 3500, overdueCents: 1000, paidCents: 4000 });
});

test('the CSV defuses formulas typed into names and notes', () => {
  const csv = svc.buildInvoicesCsv([{
    invoice_number: 'INV-0001', agent_name: '=HYPERLINK("x")', agent_email: 'a@b.com', listing_address: '1 Main St',
    line_items: [{ description: 'Flyers', amount_cents: 12550 }], total_cents: 12550, status: 'sent', sent_at: '2026-10-01T00:00:00Z', note: '+1+2'
  }]);
  const row = csv.split('\n')[1];
  assert.ok(row.includes(`"'=HYPERLINK(""x"")"`));
  assert.ok(row.includes(`"'+1+2"`));
  assert.ok(row.includes('"125.50"'));
});

test('the email escapes everything the loan officer typed and never has a pay button', () => {
  const html = svc.buildInvoiceEmail({
    invoice: {
      invoice_number: 'INV-0001', lo_name: 'Pat <b>LO</b>', lo_company: 'Acme "Lending"', lo_nmls: '12345',
      listing_address: '1 Main St', due_date: '2026-11-01', total_cents: 20000,
      line_items: [{ description: '<script>alert(1)</script>', amount_cents: 20000 }],
      payment_instructions: 'Zelle to pat@example.com', note: 'Thanks & regards'
    },
    link: 'https://homelistingai.com/invoice/abc'
  });
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('Pat &lt;b&gt;LO&lt;/b&gt;'));
  assert.ok(html.includes('$200.00'));
  assert.ok(html.includes('not a party to any payment'));
  assert.ok(html.includes('View invoice'));
  assert.ok(!/pay now|checkout|stripe/i.test(html));
});
