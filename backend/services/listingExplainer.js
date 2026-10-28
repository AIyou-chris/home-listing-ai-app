'use strict';
// "Ask the AI" video for one listing, made for a loan officer to share.
// The home's facts lead, followed by a buyer question and answer. Drawn in code: no paid video AI.
// Only real listing facts and the loan officer's own name and NMLS go on screen. Nothing is invented: no rates, no promises.
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { findVoiceViolations } = require('./brandVoice');
const { PLATFORM_BANNED_PHRASES } = require('./loBrainService');
const { business } = require('../marketing-engine/config/business');

const loadCodeVideo = () => require('../marketing-engine/tools/code-video/src/index.cjs');
const WIDTH = 540;

const clip = (text, max) => String(text || '').trim().slice(0, max);
// Names come from a profile a person typed, so keep only ordinary name characters and run the same word checks as a post.
const safeText = (text, max) => {
  const cleaned = String(text || '').replace(/[^\p{L}\p{N} .,'&#-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, max);
  if (!cleaned) return '';
  if (findVoiceViolations(cleaned).length || PLATFORM_BANNED_PHRASES.some((p) => cleaned.toLowerCase().includes(p))) return '';
  return cleaned;
};
const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString('en-US')}`;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// The street part of an address ("123 Palm Ave, Miami, FL" becomes "123 Palm Ave").
const streetOf = (address) => clip(String(address || '').split(',')[0], 28);

// Question and answer pairs that use only facts the listing really has. `variant` rotates through the ones that apply.
function questionsFor(listing) {
  const beds = Number(listing.bedrooms) || 0;
  const baths = Number(listing.bathrooms) || 0;
  const price = Number(listing.price) || 0;
  const out = [];
  if (beds && baths) out.push({ question: 'How many bedrooms and baths?', answer: `I am an AI. It has ${plural(beds, 'bedroom')} and ${plural(baths, 'bath')}.` });
  if (price) out.push({ question: 'What is the asking price?', answer: `I am an AI. It is listed at ${money(price)}.` });
  out.push({ question: 'Can I ask about this home?', answer: 'I am an AI. Yes, ask me anything about it.' });
  return out;
}

// The words for the chat-answer scene. Throws if there is no loan officer name or NMLS (they go on the end card).
function buildListingConfig({ listing, lo, variant = 0 }) {
  const name = safeText(lo?.name, 40);
  const nmls = String(lo?.nmls_number || '').replace(/\D/g, '').slice(0, 10);
  if (!name) throw new Error('NEED_LO_NAME');
  if (!nmls) throw new Error('NEED_NMLS');
  const street = streetOf(listing.address) || 'This home';
  const qa = questionsFor(listing);
  const pick = qa[((Number(variant) || 0) % qa.length + qa.length) % qa.length];
  const base = business.video?.base || {};
  return {
    ...base,
    brand: clip((safeText(lo?.company, 20) || name).toUpperCase(), 20),
    homeFacts: [Number(listing.price) > 0 && `Listed at ${money(listing.price)}.`, Number(listing.bedrooms) > 0 && `${plural(Number(listing.bedrooms), 'bedroom')}.`, Number(listing.bathrooms) > 0 && `${plural(Number(listing.bathrooms), 'bath')}.`].filter(Boolean).join(' '),
    business: street, question: pick.question, answer: pick.answer,
    endHeadline: ['Ask about', 'this home.'], endAccent: 'this home.',
    endLine: clip(`${name} · NMLS ${nmls} · Equal Housing Opportunity`, 110),
    cta: 'ASK ABOUT THIS HOME', small: 'An AI assistant answers. Not a commitment to lend.',
    url: listing.share_url || 'homelistingai.com'
  };
}

// ---- the AI brain: the buyer's question and the AI's answer are written fresh for this home, from the home's real facts only ----
const digitsIn = (text) => (String(text || '').match(/\d[\d,]*/g) || []).map((d) => d.replace(/,/g, ''));
function allowedNumbers(listing) {
  const out = new Set();
  const add = (v) => { if (v !== undefined && v !== null && String(v) !== '') out.add(String(v).replace(/,/g, '')); };
  add(Math.round(Number(listing.price) || 0)); add(Number(listing.bedrooms) || 0); add(Number(listing.bathrooms) || 0);
  digitsIn(listing.address).forEach(add);
  out.add('1'); out.add('2'); // "one of", "two ways"
  return out;
}
const factsText = (listing) => [
  listing.address && `Address: ${streetOf(listing.address)}`,
  Number(listing.price) && `Price: ${money(listing.price)}`,
  Number(listing.bedrooms) && `Bedrooms: ${Number(listing.bedrooms)}`,
  Number(listing.bathrooms) && `Bathrooms: ${Number(listing.bathrooms)}`
].filter(Boolean).join('. ');

// Returns the AI-written pieces (time of day, why the office is closed, the question, the answer, the two follow-up choices), or null.
// Every number the AI uses must be one of the home's own facts; anything else and the plain built-in question is used instead.
async function writeListingWords({ listing, openai, write = require('../marketing-engine/services/explainerSceneWriter').writeScene, seed = '' }) {
  if (!openai) return null;
  try {
    const facts = factsText(listing);
    if (!facts) return null;
    const post = { title: `Ask about ${streetOf(listing.address) || 'this home'}`, text: `The only facts about this home. ${facts}.`, facts: [] };
    const out = await write({ name: 'listing-chat', post, openai, seed: `${listing.id}:${seed}` });
    if (!out?.ok) return null;
    const w = out.words;
    const allowed = allowedNumbers(listing);
    const used = digitsIn([w.question, w.answer, w.closedLine].join(' '));
    if (used.some((d) => !allowed.has(d))) return null;
    if (/\b(rate|rates|afford|approved|pre-?approv\w*|neighborhood|school|schools|tax|taxes)\b/i.test([w.question, w.answer].join(' '))) return null;
    const picked = {};
    for (const k of ['closedLine', 'timeLabel', 'timeSuffix', 'question', 'answer', 'options']) if (w[k]) picked[k] = w[k];
    return picked;
  } catch { return null; }
}

// Makes the video and returns the MP4 bytes. With an AI client the buyer's question and the answer are written for this home and the video has a
// voice; without one (or if the AI's words fail the checks) the built-in question is used. The name, NMLS and the "not a commitment" line are always ours.
async function renderListingExplainer({ listing, lo, variant = 0, width = WIDTH, openai = null, write, record }) {
  let config = buildListingConfig({ listing, lo, variant });
  const written = await writeListingWords({ listing, openai, write, seed: String(variant) });
  if (written) config = { ...config, ...written };
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hlai-listing-explainer-'));
  try {
    const cv = loadCodeVideo();
    const scene = require('./listingVideoScene.cjs');
    const audio = {};
    if (business.video?.music) audio.music = business.video.music;
    if (openai || record) {
      const lines = scene.narration(config);
      const cues = await require('../marketing-engine/services/explainerVoice').recordLines({ lines, dir, ...(record ? { record } : {}) });
      if (cues.length) { audio.cues = cues; config = require('../marketing-engine/services/explainerVideo').withVoiceDisclosure(config); }
    }
    const out = path.join(dir, 'explainer.mp4');
    const drawn = scene.createScene(config);
    await cv.renderVideo({ draw: drawn.draw, duration: drawn.duration, out, width, preset: 'veryfast', ...(audio.music || audio.cues ? { audio } : {}) });
    return await fs.readFile(out);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
}

// One render at a time, so a few loan officers pressing the button together cannot use up the server's memory.
let chain = Promise.resolve();
const renderOneAtATime = (args) => { const run = chain.then(() => renderListingExplainer(args)); chain = run.catch(() => {}); return run; };

// Makes it and saves it where the loan officer can play and share it. Returns { url, path }.
// The bucket must accept video files. (The card-picture bucket only accepts images, which is why the first videos could not be saved.)
const VIDEO_BUCKET = process.env.LISTING_VIDEO_BUCKET || 'property-images';
async function makeAndStore({ supabaseAdmin, bucket = VIDEO_BUCKET, listing, lo, variant, openai = null, render = renderOneAtATime }) {
  const bytes = await render({ listing, lo, variant, openai });
  const storagePath = `explainers/${listing.id}/${crypto.randomUUID()}.mp4`;
  const { error } = await supabaseAdmin.storage.from(bucket).upload(storagePath, bytes, { contentType: 'video/mp4', upsert: false });
  if (error) throw new Error(`upload_failed:${error.message}`);
  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(storagePath);
  return { url: data?.publicUrl || null, path: storagePath, bytes: bytes.length };
}

module.exports = { writeListingWords, allowedNumbers, factsText, digitsIn, VIDEO_BUCKET, buildListingConfig, renderListingExplainer, makeAndStore, questionsFor, streetOf, safeText };
