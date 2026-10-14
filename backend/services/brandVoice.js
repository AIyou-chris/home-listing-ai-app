// One voice for every brain. Source of truth: docs/BRAND_VOICE_PLAYBOOK.md

const BANNED_WORDS = [
  'revolutionary', 'game-changer', 'game changer', 'transform', 'leverage', 'synergy', 'empower',
  'solution', 'best-in-class', 'seamless', 'unlock', 'elevate', 'cutting-edge', 'powerful',
  'effortless', 'supercharge', 'generate leads', 'act now', 'limited time', 'guarantee',
  'no lead goes cold', 'never miss a lead', "dive in", "in today's fast-paced world",
  'revolutionize', 'unlock the power', 'next-generation', 'game-changing', 'innovative solution',
  "in today's digital landscape", 'unparalleled', 'robust solution', 'at the forefront', 'holistic',
  'utilize', 'facilitate', 'world-class', 'industry-leading'
];

const VOICE_RULES = `CHRIS POTTER VOICE (every reply; the Golden Rules above always win):
- Write like an experienced business owner talking to another person. Simple, direct, human. 6th-8th grade words. No corporate language.
- Lead with the answer, then the reason, then one next step. Cut anything that does not help.
- Use contractions and short sentences. Mix long and short. A fragment is fine when it helps.
- Sell outcomes before technology. AI is a teammate that works beside people, never a replacement.
- Confident, honest, never pushy. Urgency only from truth, never fear, fake scarcity or hype. At most one exclamation mark. No ALL CAPS.
- Chat replies: 1-3 short sentences. Real details beat adjectives. Warm with buyers, never argue.
- In strategy and internal work: challenge weak ideas (problem, why, better option) and give one verdict.
- Never promise results, rates, approvals or timelines. Never invent a fact, price, number or result. If unsure, say so and offer a person.
- Never use: ${BANNED_WORDS.join(', ')}.
- Before sending, ask: does this sound like a real businessperson talking, or like AI writing copy? If AI, rewrite.`;

const MARKETING_VOICE_RULES = `MARKETING VOICE (Chris Potter):
- Hook with a painful truth, a contrast or a clear outcome. Headlines with some attitude, never hype ("Stop adding software. Start adding help.").
- Order: hook, problem or truth, outcome, how it works, proof only if real, risk reversal (7-day trial, no card), one concrete CTA.
- Feature, then job, then outcome. One idea per post. Short paragraphs.
- Concrete CTAs: Start My Free Trial, See How It Works, Show Me the Demo.`;

const findVoiceViolations = (text) => {
  const lower = String(text || '').toLowerCase();
  const hits = BANNED_WORDS.filter((w) => lower.includes(w));
  const bangs = (String(text || '').match(/!/g) || []).length;
  if (bangs > 1) hits.push('more than one exclamation mark');
  if (/^\s*attention\b/i.test(String(text || ''))) hits.push('opens with "Attention"');
  return hits;
};

// The model still slips banned words in. This swaps them for plain ones, keeps one "!" at most
// and fills leftover placeholders, so a draft never reaches the admin with them in.
const PLAIN_WORDS = [
  [/game[- ]chang(?:er|ing)/gi, 'big help'], [/\bpowerful\b/gi, 'strong'], [/\belevate\b/gi, 'improve'],
  [/\bunlock the power of\b/gi, 'use'], [/\bunlock\b/gi, 'open up'], [/\btransform(s|ed|ing)?\b/gi, (m, e) => `change${e === 's' ? 's' : e === 'ed' ? 'd' : e === 'ing' ? 'ing' : ''}`.replace('changeing', 'changing')],
  [/\bleverage\b/gi, 'use'], [/\bseamless(ly)?\b/gi, 'smooth'], [/\beffortless(ly)?\b/gi, 'easy'],
  [/\bempower(s|ed|ing)?\b/gi, 'help'], [/\brevolutioniz(e|es|ed|ing)\b/gi, 'change'], [/\brevolutionary\b/gi, 'new'],
  [/\bcutting-edge\b/gi, 'modern'], [/\bsupercharge\b/gi, 'boost'], [/\bdive in\b/gi, 'take a look'],
  [/\bnever miss (?:a |any |another )?leads?\b/gi, 'miss fewer leads'], [/\bno lead goes cold\b/gi, 'fewer leads go cold'],
  [/\bsolutions?\b/gi, 'tool'], [/\butilize\b/gi, 'use'], [/\bfacilitate\b/gi, 'help']
];
const scrubVoice = (value) => {
  if (typeof value !== 'string') return value;
  let text = value.replace(/^\s*attention\b[^!.\n]*[!.]\s*/i, '');
  for (const [pattern, plain] of PLAIN_WORDS) {
    text = text.replace(pattern, (...args) => {
      const match = args[0];
      const swap = typeof plain === 'function' ? plain(...args) : plain;
      return /^[A-Z]/.test(match) ? swap.charAt(0).toUpperCase() + swap.slice(1) : swap;
    });
  }
  text = text.replace(/\[(?:your )?name\]/gi, (m) => (/your/i.test(m) ? 'Chris' : 'there'));
  let seen = false;
  text = text.replace(/!/g, () => { if (!seen) { seen = true; return '!'; } return '.'; });
  return text;
};

module.exports = { scrubVoice, BANNED_WORDS, VOICE_RULES, MARKETING_VOICE_RULES, findVoiceViolations };
