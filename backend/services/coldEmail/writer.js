'use strict';

const { factsAsPromptBlock, APPROVED_FACTS } = require('./facts');
const { checkColdEmail, BANNED_WORDS } = require('./rules');
const { FIRST_TOUCHES, SAMPLE } = require('./examples');
const { fill } = require('./templates');

const ANGLES = {
  agent_referrals: 'Give agents a reason to call you first.',
  warm_vs_cold: 'Stop renting leads. Start owning relationships.',
  built_for_market: 'Your pipeline should not stop when rates rise.',
  time_saver: 'Every buyer who asks about a listing gets an answer at 9pm, and you get the warm lead.'
};

const OPENERS = {
  A: 'Their market plus agent referrals slowing (safe default when there is no personal data).',
  B: 'One real, verified fact about them (supplied below). Use it exactly; never embellish.',
  C: 'Their brokerage and agent partners (only the names supplied below).',
  D: 'Peer story from Chris: "I\'m a loan officer too" and why he built it.',
  E: 'The $200-lead problem: paying for internet leads that never pick up.'
};

// Choose the opener from the data we really have. Never a fabricated one.
const pickOpener = ({ requested, personalizationFact, company, founderVoice, buysLeads } = {}) => {
  if (requested && OPENERS[requested]) {
    if (requested === 'B' && !personalizationFact) return 'A';
    if (requested === 'C' && !company) return 'A';
    return requested;
  }
  if (personalizationFact) return 'B';
  if (founderVoice) return 'D';
  if (buysLeads) return 'E';
  if (company) return 'C';
  return 'A';
};

const buildWriterPrompt = ({ touch = 1, angle = 'agent_referrals', opener = 'A', firstName, company, market, personalizationFact, replyOnly = true, winner = '', theme = '' }) => {
  const example = FIRST_TOUCHES.find((x) => x.angle === angle) || FIRST_TOUCHES[0];
  return [
    'You write one cold email from Chris Potter, founder of HomeListingAI, to a loan officer. Output JSON only.',
    '',
    factsAsPromptBlock(),
    '',
    'VOICE: calm, specific, short. A colleague who has been in the trenches, not a vendor. First person only. Plain words and real situations.',
    `NEVER use these words or phrases: ${BANNED_WORDS.join(', ')}.`,
    'NEVER invent stats, names, testimonials, or "loan officers like you". NEVER promise approvals, rates, volume or income. NEVER hint at payment for referrals.',
    '',
    `Touch number: ${touch}. Angle: ${angle} - ${ANGLES[angle] || ANGLES.agent_referrals}`,
    `Opener ${opener}: ${OPENERS[opener] || OPENERS.A}`,
    `Recipient first name: ${firstName || 'there'}. Company: ${company || 'unknown'}. Market: ${market || 'unknown'}.`,
    personalizationFact ? `Real fact about them (use as the opener, exactly as true): ${personalizationFact}` : 'No personal fact is available. Do NOT pretend to know anything about them.',
    winner ? `Recent winner to lean toward (tone only): ${winner}` : '',
    theme ? `This email goes with a marketing campaign about: ${theme}. Let it shape the one idea you lead with, only where it fits the angle. Never invent a fact from it.` : '',
    '',
    'HARD RULES:',
    '- 55 to 110 words and 4 to 6 short sentences after the greeting.',
    '- Subject: 2 to 6 words, lowercase or sentence case, no emoji, no "Re:", looks like a coworker wrote it.',
    '- Line 1 is about THEM or their situation, not about us.',
    '- Then the problem in their words, then one plain sentence: an AI chat on a listing page with your name on it, so buyers raise their hand and the warm lead is routed directly to you.',
    '- One low-friction ask they can answer in one word. ' + (replyOnly ? 'Use a reply ask like "Worth a 2-minute look?" and NO link.' : `You may include exactly one link: ${APPROVED_FACTS.links.demo}`),
    '- Plain text only. No bold, bullets, images or HTML. At most one exclamation mark.',
    '- Greet with "Hi {{first_name}}," (leave the placeholder as written). End with: Chris, then a new line "Founder, HomeListingAI".',
    '',
    'Match the voice and length of this example (do not copy it):',
    `Subject: ${example.subject}`,
    fill(example.body, SAMPLE),
    '',
    'Return JSON: {"subject": string, "body_text": string, "opener_used": string, "angle_used": string}'
  ].filter(Boolean).join('\n');
};

const parseWriterOutput = (raw) => {
  let text = String(raw || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('writer_no_json');
  const data = JSON.parse(text.slice(start, end + 1));
  const subject = String(data.subject || '').trim();
  const body = String(data.body_text || data.body || '').replace(/<\/?p>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').trim();
  if (!subject || !body) throw new Error('writer_empty');
  return { subject, body_text: body, opener_used: data.opener_used || null, angle_used: data.angle_used || null };
};

// Ask the model, run the checker, and ask again (at most 2 rewrites) with the failures spelled out.
// `complete(prompt)` is injected (OpenAI in production, a stub in tests).
const draftFirstTouch = async ({ complete, params, maxRewrites = 2 }) => {
  const opener = pickOpener({ requested: params.opener, personalizationFact: params.personalizationFact, company: params.company });
  const base = { ...params, opener, touch: 1 };
  let prompt = buildWriterPrompt(base);
  let last = null;
  for (let attempt = 0; attempt <= maxRewrites; attempt += 1) {
    const parsed = parseWriterOutput(await complete(prompt));
    // The model sees the placeholder; real values are filled before the final check.
    const filledBody = fill(parsed.body_text, { first_name: params.firstName || 'there', company: params.company || '', city: params.market || '' });
    const check = checkColdEmail({ touch: 1, subject: fill(parsed.subject, { company: params.company || '', city: params.market || '' }), body: filledBody, replyOnly: params.replyOnly !== false });
    last = { subject: parsed.subject, body_text: filledBody, opener_used: opener, angle_used: params.angle, word_count: check.wordCount, flags: check.failures.map((f) => f.message), ok: check.ok, attempts: attempt + 1 };
    if (check.ok) return last;
    prompt = `${buildWriterPrompt(base)}\n\nYour last draft failed these checks. Fix every one and return the full JSON again:\n${check.failures.map((f) => `- ${f.message}`).join('\n')}\n\nLast draft:\nSubject: ${parsed.subject}\n${parsed.body_text}`;
  }
  return last; // still failing: the screen shows the flags and sending is blocked
};

module.exports = { ANGLES, OPENERS, pickOpener, buildWriterPrompt, parseWriterOutput, draftFirstTouch };
