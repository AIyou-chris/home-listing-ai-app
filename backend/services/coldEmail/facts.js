'use strict';

// Everything the cold-email writer is allowed to claim. If it is not here, it does not go in an email.
const APPROVED_FACTS = {
  sender: { name: 'Chris Potter', first: 'Chris', title: 'Founder, HomeListingAI', note: '15 years in mortgage; lived 2007 and 2012; built this for himself first.' },
  product: [
    'HomeListingAI puts an AI chat on a listing page with the loan officer\'s name on it.',
    'Buyers who ask about a house raise their hand, and the warm lead is routed directly to the loan officer.',
    'The agent gets a better listing page. It is free for the agent.',
    'A WOW Link is a phone-style page for one listing that the loan officer sends an agent, with the loan officer\'s name on it.',
    'It answers listing questions and captures pre-approval interest, then routes the person to the loan officer.',
    'It does not quote rates and it does not take applications.',
    'Setup is one invite and one listing.',
    'The 7-day free trial needs no card.'
  ],
  prices: { loLite: 79, lo: 149, loPro: 299 },
  math: 'One closed loan ($3K-$6K commission) covers 20+ months of the $149/mo LO plan. This is an example, not a promise.',
  links: {
    demo: 'https://homelistingai.com/partner-invite/demo',
    pitch: 'https://homelistingai.com/for-loan-officers'
  },
  // Numbers that may appear in an email. Anything else numeric is blocked.
  allowedNumbers: ['79', '149', '299', '7', '5', '2', '15', '20', '3k', '6k', '9', '24', '50', '16', '2007', '2012'],
  ownedPhrases: [
    'Warm leads, not cold calls',
    'Partner who calls you first',
    'One invite. One listing. One warm lead.',
    'Your name on every page'
  ]
};

const factsAsPromptBlock = () => [
  'APPROVED FACTS (the only claims you may make):',
  ...APPROVED_FACTS.product.map((p) => `- ${p}`),
  `- Plans: $${APPROVED_FACTS.prices.loLite}/mo LO Lite, $${APPROVED_FACTS.prices.lo}/mo LO, $${APPROVED_FACTS.prices.loPro}/mo LO Pro.`,
  `- Math (label it as an example): ${APPROVED_FACTS.math}`,
  `- Sender: ${APPROVED_FACTS.sender.name}, ${APPROVED_FACTS.sender.title}. ${APPROVED_FACTS.sender.note}`,
  `- Owned phrases (use at most one per email): ${APPROVED_FACTS.ownedPhrases.join(' | ')}`
].join('\n');

module.exports = { APPROVED_FACTS, factsAsPromptBlock };
