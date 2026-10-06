// One voice for every brain. Source of truth: docs/BRAND_VOICE_PLAYBOOK.md

const BANNED_WORDS = [
  'revolutionary', 'game-changer', 'game changer', 'transform', 'leverage', 'synergy', 'empower',
  'solution', 'best-in-class', 'seamless', 'unlock', 'elevate', 'cutting-edge', 'powerful',
  'effortless', 'supercharge', 'generate leads', 'act now', 'limited time', 'guarantee',
  'no lead goes cold', 'never miss a lead', "dive in", "in today's fast-paced world"
];

const VOICE_RULES = `BRAND VOICE (every reply):
- Sound like a calm, experienced loan officer talking to a colleague. Plain words, specific, never pushy.
- Answer the question in the first sentence. Then, at most, one useful next step or one question.
- Keep chat replies to 1-3 short sentences. Real details beat adjectives.
- At most one exclamation mark. Never open with "Attention" or "Hey there".
- Say "helps" and "supports", never promise results, rates, approvals or timelines.
- Never use: ${BANNED_WORDS.join(', ')}.
- If you do not know, say so and offer a person. Never invent a fact, price or result.`;

const findVoiceViolations = (text) => {
  const lower = String(text || '').toLowerCase();
  const hits = BANNED_WORDS.filter((w) => lower.includes(w));
  const bangs = (String(text || '').match(/!/g) || []).length;
  if (bangs > 1) hits.push('more than one exclamation mark');
  if (/^\s*attention\b/i.test(String(text || ''))) hits.push('opens with "Attention"');
  return hits;
};

module.exports = { BANNED_WORDS, VOICE_RULES, findVoiceViolations };
