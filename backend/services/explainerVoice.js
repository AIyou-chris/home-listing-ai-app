'use strict';
// Spoken voice for the animated explainer videos. Each scene says what is said and when (its `narration`);
// this turns those lines into audio with OpenAI speech, one short clip per line, in a different voice for each speaker.
// Costs about a cent or less per video (estimate). Every line passes the same wording checks as a post before it is spoken.
const fs = require('fs/promises');
const path = require('path');
const { textProblems } = require('./autopilot/safety');

const MODEL = 'gpt-4o-mini-tts';
const VOICES = { narrator: 'ash', customer: 'echo', assistant: 'coral' };
const ROLE_STYLE = {
  narrator: 'Calm, confident and friendly, like an experienced loan officer talking to a friend. Natural pace.',
  customer: 'Casual, like someone typing a quick question late at night.',
  assistant: 'Warm, clear and helpful, like a friendly receptionist. It is an AI assistant, so sound natural but not human-pretending.'
};
const MAX_LINES = 8;
const MAX_CHARS = 220;

async function speak({ text, role, apiKey, fetchImpl = fetch }) {
  if (!apiKey) throw new Error('voice_not_configured');
  const res = await fetchImpl('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, voice: VOICES[role] || VOICES.narrator, input: text, instructions: ROLE_STYLE[role] || ROLE_STYLE.narrator, response_format: 'mp3' })
  });
  if (!res.ok) throw new Error(`voice_failed_${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// Records the scene's lines. Returns the cues the video maker mixes in: [{ at, file, maxSeconds }].
// A line that fails the wording checks, is too long, or cannot be recorded is simply left out (the video still plays).
async function recordLines({ lines, dir, apiKey = process.env.OPENAI_API_KEY, fetchImpl = fetch, record = speak, log = console }) {
  const cues = [];
  for (const line of (lines || []).slice(0, MAX_LINES)) {
    const text = String(line.text || '').trim();
    if (!text || text.length > MAX_CHARS) continue;
    if (textProblems(text, 'voice').length) continue;
    try {
      const bytes = await record({ text, role: line.role, apiKey, fetchImpl });
      const file = path.join(dir, `voice-${line.id}.mp3`);
      await fs.writeFile(file, bytes);
      cues.push({ at: line.at, file, maxSeconds: line.maxSeconds });
    } catch (error) {
      log.warn?.(`[Explainer voice] line "${line.id}" skipped: ${error?.message || error}`);
    }
  }
  return cues;
}

module.exports = { recordLines, speak, VOICES, MAX_LINES };
