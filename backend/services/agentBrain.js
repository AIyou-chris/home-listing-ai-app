'use strict';

// A listing agent's own notes for their listing chat. Saved in agents.metadata.agent_brain.
// These can add facts and tone. They can NEVER switch off the platform rules (Fair Housing,
// no rates, no approvals, no inventing details): those stay in the listing prompt.

const MAX_FAQ = 20;
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

const sanitizeAgentBrain = (raw) => {
  const input = raw && typeof raw === 'object' ? raw : {};
  const faq = (Array.isArray(input.faq) ? input.faq : [])
    .slice(0, MAX_FAQ)
    .map((f) => ({ question: str(f?.question, 200), answer: str(f?.answer, 600) }))
    .filter((f) => f.question && f.answer);
  return {
    about: str(input.about, 1500),
    style: str(input.style, 1000),
    areas: str(input.areas, 600),
    showings: str(input.showings, 800),
    neverSay: str(input.neverSay, 800),
    faq
  };
};

const hasAnything = (b) => Boolean(b && (b.about || b.style || b.areas || b.showings || b.neverSay || (b.faq && b.faq.length)));

// Text appended to the listing prompt. Empty string when the agent has not written anything.
const buildAgentNotes = (raw) => {
  const b = sanitizeAgentBrain(raw);
  if (!hasAnything(b)) return '';
  const parts = [];
  if (b.about) parts.push(`About the agent: ${b.about}`);
  if (b.style) parts.push(`How the agent likes buyers handled: ${b.style}`);
  if (b.areas) parts.push(`Areas the agent works: ${b.areas}`);
  if (b.showings) parts.push(`Showings: ${b.showings}`);
  if (b.faq.length) parts.push(`Answers the agent has approved:\n${b.faq.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n')}`);
  if (b.neverSay) parts.push(`The agent asks you never to say: ${b.neverSay}`);
  return parts.join('\n');
};

module.exports = { sanitizeAgentBrain, buildAgentNotes, hasAnything };
