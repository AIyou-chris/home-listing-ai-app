'use strict';
// "Ask the AI" video for one listing, made for a loan officer to share.
// A short chat plays out on a phone: a buyer asks about the home, the AI (which says it is an AI) answers from the
// listing's own facts, the lead goes to the loan officer. Drawn in code (backend/tools/code-video): no paid video AI.
// Only real listing facts and the loan officer's own name and NMLS go on screen. Nothing is invented: no rates, no promises.
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { findVoiceViolations } = require('./brandVoice');
const { PLATFORM_BANNED_PHRASES } = require('./loBrainService');
const { business } = require('../config/business');

const loadCodeVideo = () => require('../tools/code-video/src/index.cjs');
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
  const first = safeText(name.split(' ')[0], 14) || 'Your loan officer';
  const street = streetOf(listing.address) || 'This home';
  const qa = questionsFor(listing);
  const pick = qa[((Number(variant) || 0) % qa.length + qa.length) % qa.length];
  const base = business.video?.base || {};
  return {
    ...base,
    brand: clip((safeText(lo?.company, 20) || name).toUpperCase(), 20),
    timeLabel: '11:38', timeSuffix: 'PM', closedLabel: 'AFTER 5',
    business: street, closedLine: 'The office is closed. Buyers still browse.',
    assistantLabel: 'AI assistant · online', avatarLetter: street.replace(/[^A-Za-z]/g, '').slice(0, 1).toUpperCase() || 'A',
    question: pick.question, answer: pick.answer, options: ['Call me', 'Text me'],
    booked: clip(`Done. ${first} will reach out.`, 40),
    leadTitle: clip(`Warm lead sent to ${first}`, 34),
    leadLines: [street, 'Name and phone captured', 'Follow-up task created'].map((l) => clip(l, 36)),
    sampleLabel: 'EXAMPLE CHAT SHOWN',
    endHeadline: ['Ask about', 'this home.'], endAccent: 'this home.',
    endLine: clip(`${name} · NMLS ${nmls} · Equal Housing Opportunity`, 110),
    cta: 'ASK ABOUT THIS HOME', small: 'An AI assistant answers. Not a commitment to lend.',
    url: base.url || 'homelistingai.com'
  };
}

// Makes the video and returns the MP4 bytes.
async function renderListingExplainer({ listing, lo, variant = 0, width = WIDTH }) {
  const config = buildListingConfig({ listing, lo, variant });
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hlai-listing-explainer-'));
  try {
    const out = path.join(dir, 'explainer.mp4');
    const music = business.video?.music;
    await loadCodeVideo().renderTemplate({ template: 'chat-answer', config, out, width, preset: 'veryfast', ...(music ? { audio: { music } } : {}) });
    return await fs.readFile(out);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
}

// One render at a time, so a few loan officers pressing the button together cannot use up the server's memory.
let chain = Promise.resolve();
const renderOneAtATime = (args) => { const run = chain.then(() => renderListingExplainer(args)); chain = run.catch(() => {}); return run; };

// Makes it and saves it where the loan officer can play and share it. Returns { url, path }.
async function makeAndStore({ supabaseAdmin, bucket = 'ai-card-assets', listing, lo, variant, render = renderOneAtATime }) {
  const bytes = await render({ listing, lo, variant });
  const storagePath = `explainers/${listing.id}/${crypto.randomUUID()}.mp4`;
  const { error } = await supabaseAdmin.storage.from(bucket).upload(storagePath, bytes, { contentType: 'video/mp4', upsert: false });
  if (error) throw new Error(`upload_failed:${error.message}`);
  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(storagePath);
  return { url: data?.publicUrl || null, path: storagePath, bytes: bytes.length };
}

module.exports = { buildListingConfig, renderListingExplainer, makeAndStore, questionsFor, streetOf, safeText };
