'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { readinessFlags } = require('../condoRules');

const v = (value) => ({ status: 'verified', value });
const levels = (flags) => flags.map((f) => f.level);

test('reserves under 10% are red, 10-14% yellow, 15%+ green', () => {
  assert.equal(readinessFlags({}, { reservePercentOfBudget: 8 })[0].level, 'red');
  assert.equal(readinessFlags({}, { reservePercentOfBudget: 12 })[0].level, 'yellow');
  assert.equal(readinessFlags({}, { reservePercentOfBudget: 15 })[0].level, 'green');
  assert.equal(readinessFlags({}, { reservePercentOfBudget: null })[0].level, 'gray');
});

test('baseline funding is red', () => {
  const f = readinessFlags({ reserve_study_method: v('Baseline Funding') }, { reservePercentOfBudget: 20 });
  assert.ok(f.some((x) => x.level === 'red' && /baseline/i.test(x.text)));
});

test('delinquency over 15% is red, under is quiet', () => {
  const high = readinessFlags({ delinquent_units_60plus: v('3'), total_units: v('10') }, {});
  assert.ok(high.some((x) => x.level === 'red' && /late on dues/.test(x.text)));
  const low = readinessFlags({ delinquent_units_60plus: v('1'), total_units: v('10') }, {});
  assert.ok(!low.some((x) => /late on dues/.test(x.text)));
});

test('"none" for assessments and repairs raises nothing', () => {
  const f = readinessFlags({ special_assessment: v('none'), critical_repairs: v('None noted') }, { reservePercentOfBudget: 16 });
  assert.deepEqual(levels(f), ['green']);
});

test('facts that were not verified are ignored', () => {
  const f = readinessFlags({ reserve_study_method: { status: 'needs_review', value: 'baseline' } }, { reservePercentOfBudget: 16 });
  assert.deepEqual(levels(f), ['green']);
});
