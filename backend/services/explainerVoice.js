'use strict';
// Spoken voice for the animated explainer videos. Each scene says what is said and when (its `narration`);
// this turns those lines into audio with OpenAI speech, one clip per line, in a different voice for each speaker.
// Costs about a cent or less per video (estimate). Every line passes the same wording checks as a post before it is spoken.
//
// Made to sound like a person, not an announcer:
//  - the newest, most natural voices, in lossless audio (no MP3 squeeze, which is part of what makes a voice sound tinny),
//  - spoken-style direction (relaxed, a little slower, real pauses),
//  - silence at the start and end of each clip trimmed, so lines fit their time without being sped up,
//  - a gentle warmth treatment (more body, less harsh top end, even volume).
const fs = require('fs/promises');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { textProblems } = require('./autopilot/safety');
const { resolveFfmpeg } = require('./ffmpegPath');

const run = promisify(execFile);
const MODEL = 'gpt-4o-mini-tts';
const VOICES = { narrator: 'cedar', customer: 'ash', assistant: 'marin' };
const COMMON = 'Speak like a real person talking to one person, not like an announcer or a recording. Relaxed, warm, a little slower than normal, with natural pauses at commas and full stops. Vary the pitch the way people do. Do not sound cheerful or salesy.';
const ROLE_STYLE = {
  narrator: `${COMMON} A friendly loan officer explaining something useful to a colleague over coffee.`,
  customer: `${COMMON} Casual and a little tired, like someone asking a quick question late at night.`,
  assistant: `${COMMON} A helpful, friendly assistant who is plainly an AI but sounds natural and kind. Clear and unhurried.`
};
const MAX_LINES = 8;
const MAX_CHARS = 220;
const MAX_SPEEDUP = 1.08; // lines are never rushed more than this; a rushed voice is what sounds like a robot

// Trim the silence at both ends, then warm it up: remove rumble, add body around 180 Hz, take the edge off 3 to 5 kHz,
// keep the level even. Applied to the voice only (the music is untouched).
const WARMTH = [
  // Trim the front, flip the clip, trim the front again (the old end), flip back: this only trims the two ends and keeps the pauses inside a line.
  'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.2,areverse',
  'highpass=f=70',
  'equalizer=f=180:width_type=o:width=1.5:g=2.5',
  'equalizer=f=3800:width_type=o:width=1.5:g=-2.5',
  'lowpass=f=11000',
  'acompressor=threshold=-21dB:ratio=2.2:attack=10:release=140:makeup=2',
  'aformat=sample_rates=44100:channel_layouts=stereo'
].join(',');

async function speak({ text, role, apiKey, fetchImpl = fetch }) {
  if (!apiKey) throw new Error('voice_not_configured');
  const res = await fetchImpl('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, voice: VOICES[role] || VOICES.narrator, input: text, instructions: ROLE_STYLE[role] || ROLE_STYLE.narrator, response_format: 'wav' })
  });
  if (!res.ok) throw new Error(`voice_failed_${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

const clipSeconds = async (file, ffmpeg) => {
  try { await run(ffmpeg, ['-nostdin', '-hide_banner', '-i', file], { timeout: 10000 }); } catch (e) {
    const m = String(e.stderr || '').match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (m) return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  }
  return 0;
};

// Trims and warms one clip. If FFmpeg cannot, the plain clip is used (never a failed video).
async function polish(rawFile, outFile, ffmpeg) {
  try {
    await run(ffmpeg, ['-nostdin', '-y', '-hide_banner', '-loglevel', 'error', '-i', rawFile, '-af', WARMTH, outFile], { timeout: 30000 });
    return outFile;
  } catch { return rawFile; }
}

// Places each clip so it finishes before the next one starts, without rushing it. A clip may start a touch early
// (never more than half a second, never over the clip before it) and is sped up only a little (at most MAX_SPEEDUP).
// Whatever still does not fit is allowed to run into the quiet before the next line rather than being squeezed.
const LEAD_MAX = 0.45;
const GAP = 0.12;
function fitToTimeline(cues) {
  const ordered = [...cues].sort((x, y) => x.at - y.at);
  let previousEnd = 0;
  return ordered.map((cue, i) => {
    const next = ordered[i + 1];
    const room = next ? Math.max(0.5, next.at - GAP - cue.at) : (cue.maxSeconds || cue.seconds);
    const speedup = cue.seconds > room ? Math.min(MAX_SPEEDUP, cue.seconds / room) : 1;
    const playing = cue.seconds / speedup;
    const overflow = Math.max(0, playing - room);
    const lead = Math.max(0, Math.min(overflow, LEAD_MAX, cue.at - previousEnd - GAP));
    const start = cue.at - lead;
    previousEnd = start + playing;
    return { ...cue, at: start, maxSeconds: room + lead, maxSpeedup: MAX_SPEEDUP, playing, overflow: Math.max(0, playing - (room + lead)) };
  });
}

// Records the scene's lines. Returns the cues the video maker mixes in: [{ at, file, maxSeconds, maxSpeedup, seconds }].
// A line that fails the wording checks, is too long, or cannot be recorded is simply left out (the video still plays).
async function recordLines({ lines, dir, apiKey = process.env.OPENAI_API_KEY, fetchImpl = fetch, record = speak, ffmpeg = resolveFfmpeg(), log = console }) {
  const cues = [];
  for (const line of (lines || []).slice(0, MAX_LINES)) {
    const text = String(line.text || '').trim();
    if (!text || text.length > MAX_CHARS) continue;
    if (textProblems(text, 'voice').length) continue;
    try {
      const bytes = await record({ text, role: line.role, apiKey, fetchImpl });
      const raw = path.join(dir, `voice-${line.id}.raw`);
      await fs.writeFile(raw, bytes);
      const file = await polish(raw, path.join(dir, `voice-${line.id}.wav`), ffmpeg);
      cues.push({ id: line.id, at: line.at, file, maxSeconds: line.maxSeconds, maxSpeedup: MAX_SPEEDUP, seconds: await clipSeconds(file, ffmpeg) });
    } catch (error) {
      log.warn?.(`[Explainer voice] line "${line.id}" skipped: ${error?.message || error}`);
    }
  }
  return fitToTimeline(cues);
}

module.exports = { recordLines, fitToTimeline, speak, polish, clipSeconds, VOICES, ROLE_STYLE, WARMTH, MAX_LINES, MAX_SPEEDUP };
