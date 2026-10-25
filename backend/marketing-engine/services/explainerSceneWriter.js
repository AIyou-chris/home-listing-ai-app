'use strict';
// The AI writer for an animated video. It fills in EVERY word of the scene (the chat, the call, the steps, the plan card, the closing
// words) from the post and its video script, so each video tells its own story instead of replaying one fixed demo.
// Everything it may say is checked in code afterwards: the wording rules every post must pass, the "this is an AI" label,
// no rates or approval talk, prices only from the settings file, and a button that matches what the post offers.
// What a scene is about, what it may show and the variety lists live in config/business.json under video.writer.
const { TEMPLATES, textOf } = require('./explainerScenes');
const { textProblems } = require('./autopilot/safety');
const { tokensFor, factsText } = require('./autopilot/facts');
const { business } = require('../config/business');

const WRITER_MODEL = process.env.VIDEO_WRITER_MODEL || 'gpt-4o';
const loadCodeVideo = () => require('../tools/code-video/src/index.cjs');

const APPROVAL_TALK = /\b(pre-?approv\w*|approved|approval|guarantee\w*|lowest rate|best rate|\d+(?:\.\d+)?\s*%)\b/i;
const AI_LABEL = /\bAI\b/;

function sceneSetup(name, cfg = business) {
  const scene = cfg.video?.scenes?.[name];
  const writer = cfg.video?.writer?.scenes?.[name];
  if (!scene || !writer) return null;
  const shape = TEMPLATES[scene.template];
  if (!shape) return null;
  return { scene, writer, shape, fields: shape.fields.filter((f) => !(writer.skipFields || []).includes(f)) };
}

// A small number from a string, so the same seed always picks the same variety.
function hashOf(text) { let h = 0; for (const ch of String(text)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }
function pickVariety(list = [], seed, avoid = []) {
  if (!list.length) return '';
  const taken = new Set(avoid.map((a) => String(a).toLowerCase()));
  const fresh = list.filter((x) => !taken.has(x.toLowerCase()));
  const pool = fresh.length ? fresh : list;
  return pool[hashOf(seed) % pool.length];
}

function promptFor({ setup, post, script, note, feedback, recent, taste, seed, cfg }) {
  const w = cfg.video.writer;
  const facts = factsText(post?.facts || []);
  const subject = pickVariety(w.variety?.[setup.writer.vary], seed, recent.map((r) => r.subject));
  const time = setup.writer.varyTime ? pickVariety(w.variety?.times, `${seed}:t`, []) : '';
  return [
    w.intro,
    `Approved facts about the product (the only abilities you may show): ${(w.abilities || []).join(' ')}`,
    cfg.prices?.note ? `Prices (the only prices that may appear): ${cfg.prices.note}.` : '',
    cfg.rules ? `Wording rules: ${cfg.rules}` : '',
    facts ? `Verified numbers you may use only if they fit, exactly as given:\n${facts}` : '',
    '',
    `POST TITLE: ${post?.title || ''}`,
    `POST TEXT: ${String(post?.text || '').slice(0, 1800)}`,
    script ? `The video script already written for this post. Build the scene from it: keep its opening hook, its words and its order, spoken the way a person would say it: ${String(script).slice(0, 900)}` : '',
    'The opening, the middle and the closing must all tell THIS post\'s story, say what the post says, in the same order, and add no claim the post does not make.',
    subject ? `Use this for the sample: ${subject}.` : '',
    time ? `Use this time of day: ${time}.` : '',
    recent.length ? `These were used recently. Do not reuse their subjects or lines: ${recent.slice(0, 8).map((r) => `${r.subject || r.scene} ("${String(r.line || '').slice(0, 50)}")`).join('; ')}.` : '',
    taste.liked.length ? `Videos the owner liked. Write in the same spirit, not the same words: ${taste.liked.map((t) => `[${t}]`).join(' ')}` : '',
    taste.disliked.length ? `Videos the owner did NOT like. Avoid what they did: ${taste.disliked.map((t) => `[${t}]`).join(' ')}` : '',
    note ? `The owner's instruction for this video. Follow it: ${note}` : '',
    feedback ? `A checker said the last try had these problems. Fix them: ${feedback}` : '',
    setup.writer.prompt,
    'End fields: endHeadline1 and endHeadline2 (two short closing lines, under 20 characters each, that sum up the post); endAccent (the last words of endHeadline2); endLine (one or two plain sentences, 110 characters at most, that carry the post\'s main point and name its offer exactly as the post does); cta (the button in capital letters, 30 characters at most, matching the post\'s own call to action: LEARN MORE when the post says visit or learn more, and TRY IT FREE FOR 7 DAYS only when the post itself offers a free trial); small (one short line, 80 characters at most, saying where to go, no promises).',
    'Plain words, short sentences, no hype, no em dashes, no semicolons. No real people or brands. Return JSON only.'
  ].filter((x) => x !== undefined && x !== null).join('\n');
}

const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

// The code-side checks. Returns plain-words problems (empty = fine).
function problemsWith({ setup, config, post, cfg, raw }) {
  const problems = [];
  const ok = new Set(tokensFor(post?.facts || []).map((t) => String(t).toLowerCase()));
  for (const text of textOf(config)) {
    problems.push(...textProblems(text, 'video text', ok));
    if (APPROVAL_TALK.test(text) && !APPROVAL_TALK.test(`${post?.title || ''} ${post?.text || ''}`)) problems.push(`"${text.slice(0, 40)}" talks about rates or approvals`);
  }
  for (const line of setup.shape.aiLines(config)) if (line && !AI_LABEL.test(line)) problems.push('the AI answer must say plainly that it is an AI');
  if (config.price && !(cfg.prices?.allowed || []).some((p) => String(config.price).replace(/\s/g, '').startsWith(p))) problems.push(`the price must be one of ${(cfg.prices?.allowed || []).join(', ')}`);
  const TRIAL = /\btrial\b|try it free|free for \d/i;
  if (TRIAL.test(String(config.cta || '')) && !TRIAL.test(`${post?.title || ''} ${post?.text || ''}`)) problems.push('the button offers a free trial but the post does not');
  for (const f of ['endLine', 'cta', 'small']) if (!clean(raw[f])) problems.push(`${f} is empty`);
  return [...new Set(problems)];
}

async function ask(openai, model, content, fields) {
  const schema = { type: 'object', additionalProperties: false, required: fields, properties: Object.fromEntries(fields.map((f) => [f, { type: 'string' }])) };
  const base = { model, temperature: 0.8, messages: [{ role: 'user', content }] };
  let response;
  try {
    response = await openai.chat.completions.create({ ...base, response_format: { type: 'json_schema', json_schema: { name: 'explainer_scene', strict: true, schema } } });
  } catch {
    response = await openai.chat.completions.create({ ...base, response_format: { type: 'json_object' } });
  }
  return JSON.parse(response.choices?.[0]?.message?.content || '{}');
}

// Returns { ok, words, subject, line, problems, tries } or null when the writer cannot run at all (no AI, unknown scene).
// `words` are the scene's words, ready to lay over the scene's own settings (they are valid for the drawing tool).
async function writeScene({ name, post, openai, note = '', feedback = '', recent = [], taste = { liked: [], disliked: [] }, seed = String(Math.random()), model = WRITER_MODEL, cfg = business, tries = 2 }) {
  const setup = sceneSetup(name, cfg);
  if (!setup || !openai?.chat?.completions?.create) return null;
  const tool = loadCodeVideo().templates[setup.scene.template];
  let lastProblems = []; let fb = feedback; let last = null;
  for (let attempt = 1; attempt <= tries; attempt += 1) {
    let raw;
    try { raw = await ask(openai, model, promptFor({ setup, post, script: post?.script, note: clean(note).slice(0, 300), feedback: fb, recent, taste, seed, cfg }), setup.fields); }
    catch { return last ? { ...last, ok: false, problems: lastProblems, tries: attempt - 1 } : null; }
    for (const key of setup.fields) raw[key] = clean(raw[key]);
    raw.cta = raw.cta.toUpperCase();
    const built = setup.shape.build(raw, setup.writer.businessFormat);
    let problems = [];
    try { tool.normalizeConfig({ ...cfg.video.base, ...setup.scene.config, ...built }); } catch (e) { problems.push(String(e.message).slice(0, 120)); }
    problems = problems.concat(problemsWith({ setup, config: built, post, cfg, raw }));
    last = { words: built, subject: raw.business || raw.guideName || raw.planName || '', line: raw.question || raw.callerSays1 || raw.step1Says || raw.endLine || '' };
    if (!problems.length) return { ok: true, ...last, problems: [], tries: attempt };
    lastProblems = problems; fb = problems.slice(0, 4).join(' ');
  }
  return { ...last, ok: false, problems: lastProblems, tries };
}

module.exports = { writeScene, sceneSetup, problemsWith, pickVariety, WRITER_MODEL };
