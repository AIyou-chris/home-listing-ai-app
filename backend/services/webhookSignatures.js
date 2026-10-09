'use strict';

// Is this webhook really from who it says? Two senders reach the phone line
// without a login, so a signature is the only thing in front of them:
//
//  * Telnyx — Ed25519 over `${telnyx-timestamp}|${raw body}` (public key, base64).
//    Ported from An AI You (ai-landing-template/server/lib/telnyx/signature.cjs).
//  * OpenAI — Standard Webhooks: HMAC-SHA256 over `${webhook-id}.${webhook-timestamp}.${raw body}`
//    with the whsec_ secret, header `webhook-signature: v1,<base64> [v1,<base64> …]`.
//
// Both refuse anything older than 5 minutes (replays). Pure node crypto, no network.

const { createPublicKey, verify, createHmac, timingSafeEqual } = require('crypto');

const MAX_AGE_SECONDS = 5 * 60;
const MAX_SKEW_SECONDS = 60;
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

function header(headers, name) {
  if (!headers) return '';
  const value = headers[name] ?? headers[name.toLowerCase()];
  if (value !== undefined) return String(value);
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? String(headers[key]) : '';
}

function checkTimestamp(value, now = Date.now(), maxAge = MAX_AGE_SECONDS) {
  const raw = String(value ?? '').trim();
  if (!/^\d+$/.test(raw)) return { ok: false, reason: 'timestamp_missing' };
  const age = now / 1000 - Number(raw);
  if (age > maxAge) return { ok: false, reason: 'timestamp_too_old' };
  if (age < -MAX_SKEW_SECONDS) return { ok: false, reason: 'timestamp_in_future' };
  return { ok: true };
}

function sameString(a, b) {
  const left = Buffer.from(String(a ?? ''), 'utf8');
  const right = Buffer.from(String(b ?? ''), 'utf8');
  return left.length > 0 && left.length === right.length && timingSafeEqual(left, right);
}

function verifyTelnyxSignature({ headers, rawBody, publicKey, now = Date.now() }) {
  if (!publicKey) return { ok: false, reason: 'public_key_not_configured' };
  const signature = header(headers, 'telnyx-signature-ed25519');
  const timestamp = header(headers, 'telnyx-timestamp');
  if (!signature) return { ok: false, reason: 'signature_missing' };
  const timing = checkTimestamp(timestamp, now);
  if (!timing.ok) return timing;
  let key;
  try {
    const bytes = Buffer.from(String(publicKey).trim(), 'base64');
    if (bytes.length !== 32) return { ok: false, reason: 'public_key_invalid' };
    key = createPublicKey({ key: Buffer.concat([ED25519_SPKI_PREFIX, bytes]), format: 'der', type: 'spki' });
  } catch {
    return { ok: false, reason: 'public_key_invalid' };
  }
  const sig = Buffer.from(signature.trim(), 'base64');
  if (sig.length !== 64) return { ok: false, reason: 'signature_malformed' };
  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody ?? ''), 'utf8');
  try {
    const ok = verify(null, Buffer.concat([Buffer.from(`${timestamp.trim()}|`, 'utf8'), body]), key, sig);
    return ok ? { ok: true } : { ok: false, reason: 'signature_invalid' };
  } catch {
    return { ok: false, reason: 'signature_invalid' };
  }
}

function verifyOpenAiWebhook({ headers, rawBody, secret, now = Date.now() }) {
  if (!secret) return { ok: false, reason: 'secret_not_configured' };
  const id = header(headers, 'webhook-id');
  const timestamp = header(headers, 'webhook-timestamp');
  const signatures = header(headers, 'webhook-signature');
  if (!id || !signatures) return { ok: false, reason: 'signature_missing' };
  const timing = checkTimestamp(timestamp, now);
  if (!timing.ok) return timing;
  const key = String(secret).startsWith('whsec_')
    ? Buffer.from(String(secret).slice(6), 'base64')
    : Buffer.from(String(secret), 'utf8');
  const body = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody ?? '');
  const expected = createHmac('sha256', key).update(`${id}.${timestamp.trim()}.${body}`).digest('base64');
  const match = signatures.split(' ').some((part) => {
    const [version, value] = part.split(',');
    return version === 'v1' && sameString(value, expected);
  });
  return match ? { ok: true } : { ok: false, reason: 'signature_invalid' };
}

// A short proof we put on the SIP leg we send to OpenAI, so a stranger who
// dials our OpenAI project can't pretend to be one of our calls.
function callToken(callId, secret) {
  return createHmac('sha256', String(secret || '')).update(`hlai-call:${callId}`).digest('base64url').slice(0, 32);
}

function callTokenMatches(callId, token, secret) {
  return Boolean(secret) && sameString(token, callToken(callId, secret));
}

// Textbelt reply webhooks: HMAC-SHA256 (hex) of `${X-textbelt-timestamp}${raw body}` with the Textbelt API key
// as the secret, header X-textbelt-signature. Textbelt's own docs say reject anything older than 15 minutes.
function verifyTextbeltWebhook({ headers, rawBody, apiKey, now = Date.now() }) {
  if (!apiKey) return { ok: false, reason: 'no_key_configured' };
  const timestamp = header(headers, 'x-textbelt-timestamp');
  const signature = header(headers, 'x-textbelt-signature');
  if (!signature) return { ok: false, reason: 'signature_missing' };
  const fresh = checkTimestamp(timestamp, now, 15 * 60);
  if (!fresh.ok) return fresh;
  const expected = createHmac('sha256', String(apiKey)).update(`${timestamp}${rawBody ?? ''}`).digest('hex');
  return sameString(signature, expected) ? { ok: true } : { ok: false, reason: 'signature_mismatch' };
}

// "STOP", "Stop.", " stop all ", "UNSUBSCRIBE!" and the other words carriers treat as an opt-out.
const STOP_WORDS = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'REVOKE', 'OPTOUT']);
function isStopMessage(text) {
  const cleaned = String(text ?? '').toUpperCase().replace(/[^A-Z]/g, '');
  return STOP_WORDS.has(cleaned);
}

module.exports = { verifyTelnyxSignature, verifyOpenAiWebhook, verifyTextbeltWebhook, isStopMessage, callToken, callTokenMatches, checkTimestamp, sameString };
