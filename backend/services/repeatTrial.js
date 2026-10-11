'use strict';

// One free trial per phone number. A second LO account that uses a phone number an earlier LO
// account already used gets no free trial (payment_status 'trial_used'), so it must pay to unlock.

const digitsOf = (v) => String(v || '').replace(/\D/g, '').slice(-10);

const isRepeatTrial = async ({ supabase, email, phone }) => {
  const mine = digitsOf(phone);
  if (mine.length < 10) return false;
  const { data } = await supabase
    .from('agents')
    .select('email, phone, account_type')
    .eq('account_type', 'lo')
    .ilike('phone', `%${mine.slice(-4)}%`)
    .limit(50);
  const me = String(email || '').toLowerCase();
  return (data || []).some((r) => digitsOf(r.phone) === mine && String(r.email || '').toLowerCase() !== me);
};

module.exports = { isRepeatTrial, digitsOf };
