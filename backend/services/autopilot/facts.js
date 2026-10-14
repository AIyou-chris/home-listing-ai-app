'use strict';
// Numbers Autopilot is allowed to quote. Each one was checked against its source on the date shown.
// Any other statistic is blocked by the safety check. Add a fact here only after checking the source.
const FACTS = {
  'nar-members-now': {
    text: 'NAR membership was about 1.44 million in June 2026, roughly 10% below its peak of about 1.6 million in October 2022.',
    source: 'NAR and HousingWire', url: 'https://nar.realtor/news/real-estate-news/even-in-a-tougher-market-realtors-are-holding-their-ground',
    asOf: '2026-06', tokens: ['1.44 million', '1.6 million', '10%', '2022', '2026']
  },
  'nar-members-one-year': {
    text: 'NAR membership fell about 1.7% in one year, from about 1.46 million to about 1.44 million (June 2025 to June 2026).',
    source: 'NAR', url: 'https://nar.realtor/news/real-estate-news/even-in-a-tougher-market-realtors-are-holding-their-ground',
    asOf: '2026-06', tokens: ['1.7%', '1.46 million', '1.44 million', '2025', '2026']
  },
  'sole-vocation': {
    text: 'In a 2025 survey, 71% of NAR members said real estate is their only job, the lowest share since 2005, and newer and younger agents were the ones leaving.',
    source: 'RealEstateNews', url: 'https://www.realestatenews.com/2025/08/06/fewer-younger-agents-holding-on-amid-market-headwinds',
    asOf: '2025-08', tokens: ['71%', '2005', '2025']
  }
};

const factsText = (keys = []) => keys.map((k) => FACTS[k]).filter(Boolean)
  .map((f) => `- ${f.text} (source: ${f.source}, as of ${f.asOf})`).join('\n');
const tokensFor = (keys = []) => keys.flatMap((k) => FACTS[k]?.tokens || []);

module.exports = { FACTS, factsText, tokensFor };
