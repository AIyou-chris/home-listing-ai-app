'use strict';
// Numbers Autopilot is allowed to quote. They live in config/business.json, each with its source and the date it was checked.
// Any other statistic is blocked by the safety check. Add a fact there only after checking the source.
const { business } = require('../../config/business');

const FACTS = business.facts;

const factsText = (keys = []) => keys.map((k) => FACTS[k]).filter(Boolean)
  .map((f) => `- ${f.text} (source: ${f.source}, as of ${f.asOf})`).join('\n');
const tokensFor = (keys = []) => keys.flatMap((k) => FACTS[k]?.tokens || []);

module.exports = { FACTS, factsText, tokensFor };
