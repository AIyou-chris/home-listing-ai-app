'use strict';

const { buildLaterTouches, OBJECTIONS, BREAKUPS } = require('./templates');

const SIGN = '\n\nChris\nFounder, HomeListingAI';

// "What good looks like": 12 first touches, 3 per angle, mixed openers. Placeholders are filled at send time.
const FIRST_TOUCHES = [
  // Angle 1: agent referrals
  { angle: 'agent_referrals', opener: 'A', subject: 'your agent partners',
    body: `Hi {{first_name}},\n\nMost loan officers I talk to say the same thing: agents send fewer referrals than they did two years ago, and the internet leads they buy don't pick up.\n\nI'm a loan officer too (15 years). I built a listing page with an AI chat on it that has your name on it, so buyers who ask about a house become a warm lead routed straight to you. The agent gets a better listing page. You get the call.\n\nWorth a 2-minute look?${SIGN}` },
  { angle: 'agent_referrals', opener: 'C', subject: 'agents at {{company}}',
    body: `Hi {{first_name}},\n\nIf the agents you work with at {{company}} are sending fewer referrals than they used to, you are not imagining it.\n\nAgents call the loan officer who makes them look good. I built a listing page with an AI chat that carries your name, so their listing answers buyers at night and the warm ones come to you.\n\nThe agent pays nothing. They just get a better page.\n\nWorth a 2-minute look?${SIGN}` },
  { angle: 'agent_referrals', opener: 'D', subject: 'a reason to call you',
    body: `Hi {{first_name}},\n\nI'm a loan officer too. After 15 years I watched the agent calls slow down, and nobody could tell me why.\n\nSo I built what I wished I had: a listing page with an AI chat and my name on it. Buyers ask questions at night, and the warm ones come straight to me.\n\nThe agent gets a better page for free.\n\nWould you want to see one with your name on it?${SIGN}` },
  // Angle 2: warm vs cold
  { angle: 'warm_vs_cold', opener: 'E', subject: 'stop renting leads',
    body: `Hi {{first_name}},\n\nIf you buy internet leads, you know the feeling of paying for a name that never picks up.\n\nI built the opposite. A listing page with your name on it, where the buyer asks the question first and raises a hand. You get a warm lead instead of a cold list.\n\nThe buyer reaches you first, and the agent keeps a better page.\n\nWorth a 2-minute look?${SIGN}` },
  { angle: 'warm_vs_cold', opener: 'A', subject: 'warm leads, not cold calls',
    body: `Hi {{first_name}},\n\nMost loan officers I know are tired of cold calls and cold lists.\n\nHere is a different way in. A listing page with an AI chat and your name on it. A buyer asks about the house, and the serious ones become a warm lead sent to you.\n\nThe agent shares the page, and you stay in front of their buyers.\n\nWorth a 2-minute look?${SIGN}` },
  { angle: 'warm_vs_cold', opener: 'B', subject: 'about your {{city}} post',
    body: `Hi {{first_name}},\n\n{{fact}}\n\nThat tells me you care about being seen by agents and buyers. I built a listing page with an AI chat and your name on it, so the buyers who ask about a house become warm leads for you.\n\nThe agent gets a better page at no cost.\n\nWorth a 2-minute look?${SIGN}` },
  // Angle 3: built for this market
  { angle: 'built_for_market', opener: 'A', subject: 'when rates move',
    body: `Hi {{first_name}},\n\nWhen rates move, the loan officers who keep a steady pipeline are the ones agents already trust.\n\nI built a listing page with an AI chat and your name on it. It keeps answering buyers while the market is slow, and the warm ones are sent to you.\n\nThe agent shares it, so you stay in front of their buyers all year.\n\nWorth a 2-minute look?${SIGN}` },
  { angle: 'built_for_market', opener: 'D', subject: 'built it for myself',
    body: `Hi {{first_name}},\n\nI'm a loan officer, and I have lived 2007 and 2012. Every slow stretch taught me the same thing: the pipeline you keep warm is the one that survives.\n\nSo I built a listing page with an AI chat and my name on it. It answers buyers all day and night and sends me the warm ones.\n\nWant to see one with your name on it?${SIGN}` },
  { angle: 'built_for_market', opener: 'E', subject: 'a slow market pipeline',
    body: `Hi {{first_name}},\n\nWhen the market slows down, paying for leads that never pick up hurts the most.\n\nI built a listing page with an AI chat and your name on it. Buyers ask about the house, and the serious ones reach you first. It starts with one invite and one listing.\n\nWorth a 2-minute look?${SIGN}` },
  // Angle 4: time saver
  { angle: 'time_saver', opener: 'A', subject: 'the 9pm buyer',
    body: `Hi {{first_name}},\n\nBuyers look at listings at 9pm, after everyone has gone home.\n\nI built a listing page with an AI chat that answers them then, with your name on it. The serious ones leave their details, and the warm lead comes to you in the morning.\n\nThe agent does nothing extra.\n\nWorth a 2-minute look?${SIGN}` },
  { angle: 'time_saver', opener: 'C', subject: 'weekends with {{company}}',
    body: `Hi {{first_name}},\n\nThe agents you partner with at {{company}} get buyer questions on Sunday night, and you are not there to answer them.\n\nI built a listing page with an AI chat and your name on it, so the page answers and the warm buyers are sent to you.\n\nSetup is one invite and one listing.\n\nWorth a 2-minute look?${SIGN}` },
  { angle: 'time_saver', opener: 'D', subject: 'my Sunday open house',
    body: `Hi {{first_name}},\n\nI'm a loan officer too. I used to sit through Sunday open houses hoping one buyer would ask about financing.\n\nNow the listing page does the asking for me. It has an AI chat with my name on it, answers buyers any hour, and sends me the warm ones.\n\nThe agent gets a better page.\n\nWorth a 2-minute look?${SIGN}` }
];

const SAMPLE = { first_name: 'Sam', company: 'Lakeside Mortgage', city: 'Austin', fact: 'You shared a post about helping first-time buyers in Austin.', demo_link: 'https://homelistingai.com/partner-invite/demo' };

// 4 complete 5-touch sequences (one per objection style).
const SEQUENCES = ['crm', 'agents', 'compliance', 'ai'].map((objection, i) => {
  const first = FIRST_TOUCHES[[0, 4, 6, 9][i]];
  const later = buildLaterTouches({ objection, breakupIndex: i });
  return { name: `Sequence ${i + 1}: ${OBJECTIONS[objection].label}`, objection, touches: { 1: { subject: first.subject, body: first.body, angle: first.angle, opener: first.opener }, ...later } };
});

module.exports = { FIRST_TOUCHES, SEQUENCES, BREAKUPS, SAMPLE };
