const test = require('node:test');
const assert = require('node:assert/strict');
const { isRepeatTrial } = require('../repeatTrial');

const fake = (rows) => ({
  from: () => ({ select: () => ({ eq: () => ({ ilike: () => ({ limit: async () => ({ data: rows }) }) }) }) }),
});

test('same phone on a different LO account is a repeat trial', async () => {
  const supabase = fake([{ email: 'old@x.com', phone: '(206) 755-1047', account_type: 'lo' }]);
  assert.equal(await isRepeatTrial({ supabase, email: 'new@x.com', phone: '+1 206-755-1047' }), true);
});
test('the same account itself is not a repeat', async () => {
  const supabase = fake([{ email: 'me@x.com', phone: '2067551047' }]);
  assert.equal(await isRepeatTrial({ supabase, email: 'ME@x.com', phone: '2067551047' }), false);
});
test('no phone or a short phone is never a repeat', async () => {
  assert.equal(await isRepeatTrial({ supabase: fake([]), email: 'a@x.com', phone: '' }), false);
  assert.equal(await isRepeatTrial({ supabase: fake([{ email: 'o@x.com', phone: '12345' }]), email: 'a@x.com', phone: '12345' }), false);
});
