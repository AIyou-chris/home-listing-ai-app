'use strict';
// The shape of each animated scene's words, for the AI writer (explainerSceneWriter.js).
// Per drawing template: which fields the writer fills in (flat, for a strict JSON schema), how they become the scene's config,
// and what text a viewer will read. Nothing here names a business: the wording for each scene (what it is about, what it may say)
// lives in config/business.json under video.writer.scenes.
const lines = (...items) => items.filter(Boolean);
const END = ['endHeadline1', 'endHeadline2', 'endAccent', 'endLine', 'cta', 'small'];
const endOf = (raw) => ({ endHeadline: lines(raw.endHeadline1, raw.endHeadline2), endAccent: raw.endAccent, endLine: raw.endLine, cta: raw.cta, small: raw.small });
const sample = (format, name) => String(format || 'Sample {business}').replace('{business}', String(name || '').replace(/^sample\s*:?\s*/i, '').trim());

const TEMPLATES = {
  'chat-answer': {
    fields: ['business', 'closedLine', 'timeLabel', 'timeSuffix', 'question', 'answer', 'optionA', 'optionB', 'booked', 'leadTitle', 'leadLine1', 'leadLine2', 'leadLine3', ...END],
    build: (raw, fmt) => ({
      business: sample(fmt, raw.business), closedLine: raw.closedLine, timeLabel: raw.timeLabel, timeSuffix: raw.timeSuffix,
      avatarLetter: String(raw.business || 'S').replace(/^sample\s*:?\s*/i, '').trim().charAt(0).toUpperCase() || 'S',
      question: raw.question, answer: raw.answer, options: [raw.optionA || 'Call me', raw.optionB || 'Text me'], booked: raw.booked,
      leadTitle: raw.leadTitle, leadLines: lines(raw.leadLine1, raw.leadLine2, raw.leadLine3), ...endOf(raw)
    }),
    // The answer the viewer sees comes from an AI and must say so.
    aiLines: (c) => [c.answer]
  },
  'phone-call': {
    fields: ['business', 'callerLabel', 'hook1', 'hook2', 'hookAccent', 'callerSays1', 'aiSays1', 'callerSays2', 'aiSays2', 'leadTitle', 'leadLine1', 'leadLine2', 'leadLine3', ...END],
    build: (raw, fmt) => ({
      business: sample(fmt, raw.business), callerLabel: raw.callerLabel, hook: lines(raw.hook1, raw.hook2), hookAccent: raw.hookAccent,
      callerSays1: raw.callerSays1, aiSays1: raw.aiSays1, callerSays2: raw.callerSays2, aiSays2: raw.aiSays2,
      leadTitle: raw.leadTitle, leadLines: lines(raw.leadLine1, raw.leadLine2, raw.leadLine3), ...endOf(raw)
    }),
    aiLines: (c) => [c.aiSays1]
  },
  walkthrough: {
    fields: ['hook1', 'hook2', 'hookAccent', 'guideName', 'step1Says', 'step1Label', 'step1Value', 'step1Result', 'step2Says', 'step2Label', 'step2Value', 'step2Result', 'step3Says', 'step3Label', 'step3Value', 'step3Result', ...END],
    build: (raw) => ({
      hook: lines(raw.hook1, raw.hook2), hookAccent: raw.hookAccent, guideName: raw.guideName,
      guideLetter: String(raw.guideName || 'A').trim().charAt(0).toUpperCase() || 'A',
      steps: [1, 2, 3].map((n) => ({ guideSays: raw[`step${n}Says`], label: raw[`step${n}Label`], value: raw[`step${n}Value`], result: raw[`step${n}Result`] })),
      ...endOf(raw)
    }),
    aiLines: () => []
  },
  plan: {
    fields: ['hook1', 'hook2', 'hookAccent', 'planName', 'price', 'item1', 'item2', 'item3', 'item4', 'perk1', 'perk2', ...END],
    build: (raw) => ({
      hook: lines(raw.hook1, raw.hook2), hookAccent: raw.hookAccent, planName: raw.planName, price: raw.price,
      items: [raw.item1, raw.item2, raw.item3, raw.item4], perks: lines(raw.perk1, raw.perk2), ...endOf(raw)
    }),
    aiLines: () => []
  }
};

// Every piece of text in a config, for the wording checks and the reviewer.
function textOf(config) {
  const out = [];
  const walk = (key, v) => {
    if (typeof v === 'string') { if (!['accent', 'avatarLetter', 'guideLetter', 'timeSuffix'].includes(key)) out.push(v); }
    else if (Array.isArray(v)) v.forEach((x) => walk(key, x));
    else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(k, x));
  };
  Object.entries(config || {}).forEach(([k, v]) => walk(k, v));
  return out.filter(Boolean);
}

module.exports = { TEMPLATES, textOf, sample };
