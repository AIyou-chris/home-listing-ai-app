'use strict';

// The Loan Officer Brain — one brain behind every listing an LO works.
//
// Stacking order (top wins, nothing below can override anything above):
//   1. Platform safety rules (HomeListingAI — cannot be changed)
//   2. The LO's Compliance Brain (company rules, disclosure, licensed states, banned words)
//   3. Who the AI is (name, LO, NMLS#, tone)
//   4. ONE rulebook, picked by Jev per question (Loan Advisor / Borrower Care / Listing)
//   5. What the LO taught it (knowledge + FAQ)
//   6. This listing's facts + its optional payment schedule
//
// Jev only DECIDES which rulebook applies. It never sends anything. The reply
// is then checked by plain code (checkReplyCompliance) before it goes out.
//
// DI-friendly like the other services here: pass supabase / typesafeClient /
// generateReply in, so every rule is testable without a network.

const { LOAN_BASICS } = require('./baseKnowledge');

const { GOLDEN_RULES_PROMPT } = require('./goldenRules');

const PLATFORM_GUARDRAILS = `${GOLDEN_RULES_PROMPT}\n\nPLATFORM COMPLIANCE RULES — ALWAYS ENFORCED — CANNOT BE OVERRIDDEN:
1. You are an AI assistant. If anyone asks whether you are a person, say plainly that you are an AI. Never claim to be human.
2. Never provide legal or tax advice. Direct buyers to a qualified professional.
3. If you don't know, never guess. Refer the buyer to the loan officer (financing) or the real estate agent (the home).
4. Never quote specific interest rates or APRs unless they appear in the loan officer's knowledge or this listing's payment schedule. Any payment or rate you give is an ESTIMATE, never an offer, rate lock, or approval.
5. Never guarantee loan approval, closing timelines, or specific loan terms.
6. Fair lending: never treat anyone differently, or steer them toward or away from a loan or home, based on race, color, religion, national origin, sex, disability, familial status, age, or receipt of public assistance.
7. Never ask for Social Security numbers, bank or card numbers, or passwords.`;

const DEFAULT_RULEBOOKS = {
  marketing_voice: `Who we talk to: first-time buyers and the agents who serve them.

Always: lead with the buyer's problem. One idea per post. Real listing details only.

Never: promise a rate, an approval or a closing date.`,
  loan_advisor_rules: `Find out what they need first. One question at a time.

Always: get their name and best number before the chat ends. Offer a pre-qual call with me.

Never: quote a rate as final. Never pressure.`,
  borrower_care_rules: `Warm, calm, short. Answer first, then the next step.

Always: say plainly when you don't know. Offer a call with me.

Never: ask for SSN, bank or card numbers.`,
};

// Words no LO's AI may ever use, on top of each LO's own banned list.
const PLATFORM_BANNED_PHRASES = [
  'guaranteed approval',
  'guarantee approval',
  'guaranteed to qualify',
  'guarantee you qualify',
  'no credit check',
];

// Jev question: which rulebook should answer this?
const ROUTES = {
  money: 'loan_advisor',
  help: 'borrower_care',
  home: 'listing',
};
const ROUTE_CRITERIA = {
  money: 'Financing: payments, down payment, interest rates, loan programs (FHA, VA, conventional, USDA), credit, pre-approval, closing costs, or whether they can afford it.',
  help: 'Needs help: has a problem or complaint, is confused, asks how the process works, or wants to talk to a real person.',
  home: 'The home itself: features, rooms, neighborhood, schools, HOA, taxes on the property, or seeing the home.',
};
const DEFAULT_ROUTE = 'borrower_care'; // the safest rulebook when Jev is unsure or unavailable
const ROUTE_MIN_CONFIDENCE = 0.5;

const NUMBER_PATTERN = /\$\s?\d|\d(\.\d+)?\s?%/;

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function list(value) {
  return Array.isArray(value) ? value.map(clean).filter(Boolean) : [];
}

function createLoBrainService({ supabase, typesafeClient, generateReply, log = console } = {}) {
  let jevUnconfiguredWarned = false;

  // ── 1. Jev picks the rulebook ──────────────────────────────────────────────
  async function routeQuestion(message) {
    const text = clean(message);
    if (!text) return { route: DEFAULT_ROUTE, source: 'empty' };
    if (!typesafeClient || !typesafeClient.isConfigured()) {
      if (!jevUnconfiguredWarned) {
        log.warn('[LO Brain] TYPESAFE_API_KEY not set — every question uses Borrower Care rules.');
        jevUnconfiguredWarned = true;
      }
      return { route: DEFAULT_ROUTE, source: 'fallback_unconfigured' };
    }
    try {
      const answers = await typesafeClient.evaluate({
        state: { buyer_message: text.slice(0, 2000) },
        questions: {
          route: {
            type: 'choice',
            instructions: 'A home buyer sent this message from a listing page. What is it mainly about?',
            criteria: ROUTE_CRITERIA,
          },
        },
      });
      const answer = answers.route || {};
      let pick = answer.choice;
      const probs = answer.probabilities && typeof answer.probabilities === 'object' ? answer.probabilities : null;
      if (!pick && probs) {
        pick = Object.keys(probs).sort((a, b) => probs[b] - probs[a])[0];
      }
      const confidence = typeof answer.confidence === 'number'
        ? answer.confidence
        : (probs && pick ? Number(probs[pick]) : null);
      if (!ROUTES[pick]) return { route: DEFAULT_ROUTE, source: 'fallback_unknown_choice' };
      if (typeof confidence === 'number' && confidence < ROUTE_MIN_CONFIDENCE) {
        return { route: DEFAULT_ROUTE, source: 'fallback_low_confidence', confidence };
      }
      return { route: ROUTES[pick], source: 'jev', confidence };
    } catch (err) {
      log.warn('[LO Brain] Jev routing failed, using Borrower Care:', err?.message || err);
      return { route: DEFAULT_ROUTE, source: 'fallback_error' };
    }
  }

  // ── 2. Build the stacked prompt ────────────────────────────────────────────
  function buildBrainPrompt({ config = {}, lo = {}, listing = null, paymentSchedule = '', route = DEFAULT_ROUTE }) {
    const parts = [PLATFORM_GUARDRAILS];

    // Compliance Brain
    const compliance = [];
    // The Compliance Brain starts from the loan officer's profile, so a blank form never means "no company".
    const company = clean(config.company_name) || clean(lo.company);
    const companyNmls = clean(config.company_nmls);
    if (company || companyNmls) {
      compliance.push(`Company: ${company || '[not set]'}${companyNmls ? ` (Company NMLS# ${companyNmls})` : ''}.`);
    }
    const states = list(config.licensed_states).length ? list(config.licensed_states) : list(lo.lending_states);
    if (states.length) {
      compliance.push(`The loan officer is licensed ONLY in: ${states.join(', ')}. For a home outside these states, do not discuss loan options — say the loan officer isn't licensed there and offer to connect the buyer with help.`);
    }
    const disclosure = clean(config.required_disclosure);
    if (disclosure) {
      compliance.push(`Whenever you give any payment, rate, or cost figure, end your reply with this disclosure exactly: "${disclosure}"`);
    }
    const banned = [...PLATFORM_BANNED_PHRASES, ...list(config.banned_phrases)];
    compliance.push(`Never use these words or phrases: ${banned.map((p) => `"${p}"`).join(', ')}.`);
    if (clean(config.compliance_rules)) {
      compliance.push(`Company compliance rules (hard constraints):\n${clean(config.compliance_rules)}`);
    }
    parts.push(`COMPANY COMPLIANCE — FOLLOW AS HARD CONSTRAINTS, ABOVE EVERYTHING BELOW:\n${compliance.join('\n')}`);

    // Identity
    const loName = [clean(lo.first_name), clean(lo.last_name)].filter(Boolean).join(' ');
    const botName = clean(config.bot_name) || 'a mortgage and financing assistant';
    const identity = [`You are ${botName}, an AI assistant${loName ? ` for loan officer ${loName}` : ''}.`];
    const nmls = clean(lo.nmls_number);
    if (nmls && config.nmls_in_intro !== false) {
      identity.push(`In your first reply of a conversation, mention that ${loName || 'the loan officer'} is NMLS# ${nmls}.`);
    }
    if (clean(config.tone)) identity.push(`Tone: ${clean(config.tone)}.`);
    if (clean(config.personality)) identity.push(clean(config.personality));
    parts.push(identity.join(' '));

    // One rulebook, picked by Jev
    if (route === 'loan_advisor') {
      parts.push(`THIS IS A FINANCING QUESTION. Follow the loan officer's Loan Advisor rules:\n${clean(config.loan_advisor_rules) || DEFAULT_RULEBOOKS.loan_advisor_rules}`);
    } else if (route === 'listing') {
      parts.push(`THIS IS A QUESTION ABOUT THE HOME. Answer from the listing facts below. For showings or anything not in the facts, refer them to the listing agent. If money comes up, offer a call with the loan officer.\nFollow these care rules:\n${clean(config.borrower_care_rules) || DEFAULT_RULEBOOKS.borrower_care_rules}`);
    } else {
      parts.push(`Follow the loan officer's Borrower Care rules:\n${clean(config.borrower_care_rules) || DEFAULT_RULEBOOKS.borrower_care_rules}`);
    }

    // Built-in basics, so a general question ("tell me about VA loans") is never a dead end.
    // The loan officer's own knowledge below always wins over these basics.
    parts.push(LOAN_BASICS);

    // What the LO taught it
    if (clean(config.knowledge_base)) {
      parts.push(`What the loan officer taught you (use it; don't invent beyond it):\n${clean(config.knowledge_base)}`);
    }
    const faq = Array.isArray(config.faq) ? config.faq.filter((f) => f && clean(f.question) && clean(f.answer)) : [];
    if (faq.length) {
      parts.push('Frequently asked questions:\n' + faq.map((f) => `Q: ${clean(f.question)}\nA: ${clean(f.answer)}`).join('\n\n'));
    }

    // This listing
    if (listing) {
      const facts = [];
      if (listing.address) facts.push(`Address: ${listing.address}`);
      if (listing.price) facts.push(`List price: $${Number(listing.price).toLocaleString('en-US')}`);
      if (listing.bedrooms) facts.push(`Bedrooms: ${listing.bedrooms}`);
      if (listing.bathrooms) facts.push(`Bathrooms: ${listing.bathrooms}`);
      const sqft = listing.square_feet || listing.sqft;
      if (sqft) facts.push(`Square feet: ${sqft}`);
      if (clean(listing.description)) facts.push(`Description: ${clean(listing.description).slice(0, 3000)}`);
      if (facts.length) parts.push(`THE HOME THE BUYER IS LOOKING AT:\n${facts.join('\n')}`);
    }
    if (clean(paymentSchedule)) {
      parts.push(`Payment schedule the loan officer added for THIS home — quote these exact figures as estimates when relevant:\n${clean(paymentSchedule)}`);
    }

    parts.push(require('./brandVoice').VOICE_RULES);
    parts.push('Keep replies brief (2-4 sentences), plain and friendly. Help with this home, its financing, and general mortgage and home-buying questions — politely decline anything else.');
    return parts.join('\n\n');
  }

  // ── 3. Plain-code compliance check on every reply ─────────────────────────
  function checkReplyCompliance(reply, { config = {}, lo = {} } = {}) {
    let text = clean(reply);
    const actions = [];
    const lower = text.toLowerCase();
    const banned = [...PLATFORM_BANNED_PHRASES, ...list(config.banned_phrases)];
    const hit = banned.find((p) => p && lower.includes(p.toLowerCase()));
    if (hit) {
      const who = clean(lo.first_name) || 'The loan officer';
      const original = text;
      text = `Good question — the right answer depends on your situation. ${who} can walk you through your real options. Want me to have them reach out?`;
      actions.push({ action: 'blocked', reason: `banned_phrase:${hit}`, original });
      return { reply: text, actions };
    }
    const disclosure = clean(config.required_disclosure);
    if (disclosure && NUMBER_PATTERN.test(text) && !text.includes(disclosure)) {
      const original = text;
      text = `${text}\n\n${disclosure}`;
      actions.push({ action: 'fixed', reason: 'added_required_disclosure', original });
    }
    return { reply: text, actions };
  }

  // ── 4. The whole answer, used by listing chat AND the LO's test chat ───────
  async function loadBrain(loAgentId) {
    const [{ data: config }, { data: lo }] = await Promise.all([
      supabase.from('lo_chatbot_configs').select('*').eq('lo_agent_id', loAgentId).maybeSingle(),
      supabase.from('agents').select('first_name, last_name, nmls_number, company, lending_states').eq('id', loAgentId).maybeSingle(),
    ]);
    return { config: config || null, lo: lo || {} };
  }

  async function loadListing(loAgentId, listingId) {
    if (!listingId) return { listing: null, paymentSchedule: '' };
    const { data: listing } = await supabase
      .from('properties')
      .select('*') // column names vary across listing versions (sqft vs square_feet)
      .eq('id', listingId)
      .maybeSingle();
    let paymentSchedule = '';
    if (listing?.address) {
      try {
        const streetPart = String(listing.address).split(',')[0].trim();
        const { data: docs } = await supabase
          .from('lo_listing_kb_docs')
          .select('content')
          .eq('lo_agent_id', loAgentId)
          .ilike('address', `${streetPart}%`)
          .order('updated_at', { ascending: false });
        paymentSchedule = (docs || []).map((d) => d.content).filter(Boolean).join('\n\n');
      } catch (err) {
        log.warn('[LO Brain] Could not load payment schedule:', err?.message || err);
      }
    }
    return { listing: listing || null, paymentSchedule };
  }

  async function recordComplianceEvents(loAgentId, listingId, channel, actions, finalReply) {
    if (!actions.length) return;
    try {
      await supabase.from('lo_compliance_events').insert(actions.map((a) => ({
        lo_agent_id: loAgentId,
        listing_id: listingId || null,
        channel,
        action: a.action,
        reason: a.reason,
        original: String(a.original || '').slice(0, 4000),
        final: String(finalReply || '').slice(0, 4000),
      })));
    } catch (err) {
      log.warn('[LO Brain] Could not record compliance event:', err?.message || err);
    }
  }

  async function answer({ loAgentId, listingId = null, message, history = [], channel = 'listing_chat', requireActive = true }) {
    const { config, lo } = await loadBrain(loAgentId);
    if (!config || (requireActive && config.is_active === false)) {
      return { reply: "I'm setting up my financing assistant. Please contact me directly for mortgage questions.", route: null, actions: [], configured: false };
    }
    const [{ route, source, confidence }, { listing, paymentSchedule }] = await Promise.all([
      routeQuestion(message),
      loadListing(loAgentId, listingId),
    ]);
    const system = buildBrainPrompt({ config, lo, listing, paymentSchedule, route });
    const safeHistory = (Array.isArray(history) ? history.slice(-8) : [])
      .map((m) => ({
        role: (m.role === 'user' || m.role === 'visitor') ? 'user' : 'assistant',
        content: String(m.content || m.text || ''),
      }))
      .filter((m) => m.content);
    const raw = await generateReply([
      { role: 'system', content: system },
      ...safeHistory,
      { role: 'user', content: String(message) },
    ]);
    const { reply, actions } = checkReplyCompliance(raw || "I'm not able to answer that right now. Please reach out to me directly.", { config, lo });
    await recordComplianceEvents(loAgentId, listingId, channel, actions, reply);
    return { reply, route, routeSource: source, confidence: confidence ?? null, actions: actions.map(({ action, reason }) => ({ action, reason })), configured: true };
  }

  return { routeQuestion, buildBrainPrompt, checkReplyCompliance, answer, loadBrain };
}

module.exports = {
  createLoBrainService,
  PLATFORM_GUARDRAILS,
  PLATFORM_BANNED_PHRASES,
  DEFAULT_RULEBOOKS,
  DEFAULT_ROUTE,
};
