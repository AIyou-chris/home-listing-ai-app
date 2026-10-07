'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHoaDocReader, FIELD_KEYS, toNumber } = require('../hoaDocReaderService');

const reader = createHoaDocReader({ openaiApiKey: 'x', pdfParse: async () => {} });
const empty = () => Object.fromEntries(FIELD_KEYS.map((k) => [k, { value: null, page: null, quote: null }]));
const pages = ['(E) NUMBER OF UNITS:  6', '(D) BEGINNING RESERVE BALANCE:  $23,402\nANNUAL ASSESSMENT INCOME  $90,000\n(G) RECOMMENDED TO BUDGET  $618.30'];

test('a fact is trusted only when its quote is on the page', () => {
  const raw = empty();
  raw.total_units = { value: '6', page: 1, quote: '(E) NUMBER OF UNITS: 6' };
  raw.reserve_balance = { value: '$99,999', page: 2, quote: 'BEGINNING RESERVE BALANCE: $99,999' };
  const f = reader.verify(raw, pages);
  assert.equal(f.total_units.status, 'verified');
  assert.equal(f.reserve_balance.status, 'needs_review');
  assert.equal(f.special_assessment.status, 'not_found');
});

test('a bare number with no label is not trusted', () => {
  const raw = empty();
  raw.reserve_balance = { value: '23,402', page: 2, quote: '$23,402' };
  assert.equal(reader.verify(raw, pages).reserve_balance.status, 'needs_review');
});

test('the same number in two fields is flagged', () => {
  const raw = empty();
  raw.annual_assessment_income = { value: '23,402', page: 2, quote: 'BEGINNING RESERVE BALANCE: $23,402' };
  raw.reserve_balance = { value: '23,402', page: 2, quote: 'BEGINNING RESERVE BALANCE: $23,402' };
  const f = reader.verify(raw, pages);
  assert.equal(f.annual_assessment_income.status, 'needs_review');
  assert.equal(f.reserve_balance.status, 'needs_review');
});

test('reserve percent of budget is computed in code and ignores nonsense', () => {
  const ok = { annual_assessment_income: { status: 'verified', value: '$90,000' }, annual_reserve_contribution: { status: 'verified', value: '$9,000' } };
  assert.equal(reader.derive(ok).reservePercentOfBudget, 10);
  const bad = { annual_assessment_income: { status: 'verified', value: '$9,000' }, annual_reserve_contribution: { status: 'verified', value: '$9,000' } };
  assert.equal(reader.derive(bad).reservePercentOfBudget, null);
  const unsure = { annual_assessment_income: { status: 'needs_review', value: '$90,000' }, annual_reserve_contribution: { status: 'verified', value: '$9,000' } };
  assert.equal(reader.derive(unsure).reservePercentOfBudget, null);
});

test('toNumber reads dollars and percents', () => {
  assert.equal(toNumber('$1,234.50'), 1234.5);
  assert.equal(toNumber('30.68%'), 30.68);
  assert.equal(toNumber('none'), null);
});
