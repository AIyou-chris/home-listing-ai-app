// Business Brain: the platform's own single source of truth (admin-edited).
// Feeds the public landing-page chat and the admin "talk to your brain" test.

const MAX_SOURCES = 100;
const MAX_SOURCE_CHARS = 20000;
const MAX_PROMPT_KNOWLEDGE_CHARS = 14000;

const DEFAULT_CONFIG = {
  aiName: 'HomeListingAI Assistant',
  voice: 'marin',
  personality:
    'You are a friendly, plain-spoken assistant for HomeListingAI. Answer clearly, never pressure, and invite people to start the free 7-day trial or book a call.',
  firstMessage: 'Hi! Ask me anything about HomeListingAI.',
  marketing:
    'Lead with the problem the loan officer has: warm leads and agent partnerships. One idea per post. Real details, no hype, no jargon.',
  sales:
    'Not pushy. Find out what they need, give a straight answer, explain the price plainly ($79 LO Lite, $149 LO, $299 LO Pro, 7-day free trial, no card). Make the next step obvious: start the trial.',
  service:
    'Warm, calm and short. Answer the question first. If you do not know, say so and offer to take a message. Never promise refunds or dates that have not been confirmed.',
  sources: []
};

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

const sanitizeSource = (raw, index) => {
  if (!raw || typeof raw !== 'object') return null;
  const content = str(raw.content, MAX_SOURCE_CHARS);
  if (!content) return null;
  const type = ['text', 'url', 'file', 'faq'].includes(raw.type) ? raw.type : 'text';
  return {
    id: str(raw.id, 60) || `src_${Date.now()}_${index}`,
    type,
    title: str(raw.title, 200) || 'Untitled',
    url: type === 'url' ? str(raw.url, 500) : '',
    content,
    createdAt: str(raw.createdAt, 40) || new Date().toISOString()
  };
};

const sanitizeConfig = (raw) => {
  const input = raw && typeof raw === 'object' ? raw : {};
  const sources = (Array.isArray(input.sources) ? input.sources : [])
    .slice(0, MAX_SOURCES)
    .map(sanitizeSource)
    .filter(Boolean);
  return {
    aiName: str(input.aiName, 80) || DEFAULT_CONFIG.aiName,
    voice: str(input.voice, 40) || DEFAULT_CONFIG.voice,
    personality: str(input.personality, 4000) || DEFAULT_CONFIG.personality,
    firstMessage: str(input.firstMessage, 300) || DEFAULT_CONFIG.firstMessage,
    marketing: str(input.marketing, 4000),
    sales: str(input.sales, 4000),
    service: str(input.service, 4000),
    sources
  };
};

const withDefaults = (stored) => {
  const base = { ...DEFAULT_CONFIG, ...(stored && typeof stored === 'object' ? stored : {}) };
  // A blank manager box falls back to the sensible default wording.
  for (const key of ['marketing', 'sales', 'service']) {
    if (!str(base[key], 10)) base[key] = DEFAULT_CONFIG[key];
  }
  return sanitizeConfig(base);
};

const buildBrainPrompt = (config) => {
  const c = withDefaults(config);
  let used = 0;
  const knowledge = [];
  for (const s of c.sources) {
    const room = MAX_PROMPT_KNOWLEDGE_CHARS - used;
    if (room <= 200) break;
    const piece = s.content.slice(0, room);
    used += piece.length;
    knowledge.push(`[${s.title}]\n${piece}`);
  }
  return [
    `You are "${c.aiName}", the assistant for HomeListingAI.`,
    c.personality,
    knowledge.length
      ? `WHAT YOU KNOW (answer from this; if it is not here, say you are not sure and offer a human follow-up):\n${knowledge.join('\n\n')}`
      : '',
    `HOW WE SELL:\n${c.sales}`,
    `HOW WE LOOK AFTER CUSTOMERS:\n${c.service}`
  ]
    .filter(Boolean)
    .join('\n\n');
};

module.exports = { DEFAULT_CONFIG, sanitizeConfig, withDefaults, buildBrainPrompt };
