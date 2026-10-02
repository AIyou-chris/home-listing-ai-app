'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { rateCaptureIntent, higherLevel } = require('../captureIntent');

test('asking for a showing is Hot, with a reason', () => {
  const r = rateCaptureIntent({ context: 'showing_requested', hasPhone: true });
  assert.equal(r.level, 'Hot');
  assert.match(r.reason, /see the home/i);
});

test('financing question is Hot', () => {
  assert.equal(rateCaptureIntent({ context: 'pre_approval', hasEmail: true }).level, 'Hot');
});

test('a report request is Warm', () => {
  assert.equal(rateCaptureIntent({ context: 'report_requested', hasEmail: true }).level, 'Warm');
});

test('leaving contact details is Warm, none is Cold', () => {
  assert.equal(rateCaptureIntent({ context: 'general_info', hasPhone: true }).level, 'Warm');
  assert.equal(rateCaptureIntent({ context: 'general_info' }).level, 'Cold');
  assert.equal(rateCaptureIntent({}).level, 'Cold');
});

test('a repeat visit can raise the rating but never lower it', () => {
  assert.equal(higherLevel('Warm', 'Hot'), 'Hot');
  assert.equal(higherLevel('Hot', 'Warm'), 'Hot');
  assert.equal(higherLevel('Cold', 'Cold'), 'Cold');
  assert.equal(higherLevel(undefined, 'Warm'), 'Warm');
});
