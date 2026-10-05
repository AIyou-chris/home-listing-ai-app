'use strict';

// Rule-based, on purpose: no AI call, no surprises, easy to test. Order matters (first match wins).
const RULES = [
  ['unsubscribe', /\b(unsubscribe|remove me|take me off|stop (?:emailing|sending|contacting)|do not (?:email|contact)|don'?t (?:email|contact)|opt[- ]?out)\b|^\s*stop\s*$/im],
  ['angry', /\b(spam|report(?:ing)? you|lawyer|attorney|harass|sue |cease and desist|how did you get my|illegal|scam|f\*+k|fuck|shit)\b/i],
  ['out_of_office', /\b(out of (?:the )?office|automatic reply|auto[- ]?reply|autoreply|on vacation|on leave|will be back|away from (?:my )?(?:desk|email))\b/i],
  ['wrong_person', /\b(wrong person|not the right (?:person|contact)|no longer (?:with|at|work)|left the company|doesn'?t work here|does not work here|forward(?:ed)? (?:this )?to|please contact)\b/i],
  ['not_now', /\b(not interested|no thanks|no thank you|not (?:right )?now|maybe later|not a fit|too busy|reach out (?:in|next)|next (?:quarter|year|month)|already (?:have|use|working))\b/i],
  ['interested', /\b(interested|tell me more|sounds (?:good|great|interesting)|send (?:me )?(?:the )?(?:info|link|details|demo)|demo|call me|let'?s (?:talk|chat|connect|schedule)|how much|pricing|price|what does it cost|show me|yes\b|sure\b|i'?d like|sign me up|worth a look|take a look)\b/i]
];

const classifyReply = (text) => {
  const body = String(text || '').split(/\n>|\nOn .+ wrote:|\n-{2,}\s*Original/i)[0].slice(0, 4000); // ignore the quoted original
  for (const [label, re] of RULES) if (re.test(body)) return label;
  return 'other';
};

const STOPS_SEQUENCE = new Set(['interested', 'not_now', 'wrong_person', 'unsubscribe', 'angry', 'out_of_office', 'other']);
const SUPPRESSES = new Set(['unsubscribe', 'angry']);
const POSITIVE = new Set(['interested']);

// A starting point for Chris. It is NEVER sent automatically.
const draftReply = ({ label, firstName }) => {
  const name = firstName || 'there';
  if (label === 'interested') {
    return `Hi ${name},\n\nThanks for the reply. The quickest way to see it is the live example here: https://homelistingai.com/partner-invite/demo\n\nIf you tell me one listing and one agent you work with, I will show you what it looks like with your name on it.\n\nChris\nFounder, HomeListingAI`;
  }
  if (label === 'not_now') return `Hi ${name},\n\nUnderstood, and thanks for telling me. I will leave you alone. If it ever makes sense, my door is open.\n\nChris`;
  if (label === 'wrong_person') return `Hi ${name},\n\nThanks for letting me know. If you can point me to the right person, I would appreciate it. If not, no problem.\n\nChris`;
  return '';
};

module.exports = { classifyReply, draftReply, STOPS_SEQUENCE, SUPPRESSES, POSITIVE };
