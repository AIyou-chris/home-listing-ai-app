const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');
const { recordLines, speak, fitToTimeline, VOICES, WARMTH, MAX_SPEEDUP } = require('../services/explainerVoice');
const explainer = require('../services/explainerVideo');
const { videoOptions } = require('../services/studioVideoOptions');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'voice-test-'));
const lines = [
  { id: 'a', at: 1, role: 'narrator', maxSeconds: 2, text: 'A buyer asked at night.' },
  { id: 'b', at: 4, role: 'customer', maxSeconds: 2, text: 'How many bedrooms and baths?' },
  { id: 'c', at: 7, role: 'assistant', maxSeconds: 3, text: 'I am an AI. It has three bedrooms.' }
];

test('each line is recorded in its own speaker voice and placed at its time', async () => {
  const asked = [];
  const cues = await recordLines({ lines, dir: tmp(), record: async (a) => { asked.push(a.role); return Buffer.from('mp3'); } });
  assert.deepStrictEqual(asked, ['narrator', 'customer', 'assistant']);
  assert.deepStrictEqual(cues.map((c) => c.id), ['a', 'b', 'c']);
  assert.deepStrictEqual(cues.map((c) => c.at), [1, 4, 7], 'a line that already fits stays exactly where the scene wants it');
  assert.ok(cues.every((c) => fs.existsSync(c.file)));
  assert.strictEqual(new Set(Object.values(VOICES)).size, 3, 'three different voices');
});

test('a line that breaks the wording rules is never spoken, and one that fails to record is skipped', async () => {
  const spoken = [];
  const cues = await recordLines({
    lines: [...lines, { id: 'd', at: 9, role: 'narrator', maxSeconds: 2, text: 'We guarantee the lowest rate, no risk.' }, { id: 'e', at: 10, role: 'narrator', maxSeconds: 2, text: 'x'.repeat(300) }],
    dir: tmp(), log: { warn() {} },
    record: async (a) => { if (a.text.startsWith('How many')) throw new Error('voice_failed_500'); spoken.push(a.text); return Buffer.from('mp3'); }
  });
  assert.strictEqual(spoken.length, 2);
  assert.deepStrictEqual(cues.map((c) => c.at), [1, 7]);
});

test('the real speech call sends the right request and refuses to run without a key or on an error', async () => {
  let seen;
  const fetchImpl = async (url, init) => { seen = { url, body: JSON.parse(init.body), auth: init.headers.Authorization }; return { ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }; };
  const bytes = await speak({ text: 'Hello', role: 'assistant', apiKey: 'k', fetchImpl });
  assert.strictEqual(bytes.length, 3);
  assert.strictEqual(seen.url, 'https://api.openai.com/v1/audio/speech');
  assert.deepStrictEqual([seen.body.model, seen.body.voice, seen.auth], ['gpt-4o-mini-tts', VOICES.assistant, 'Bearer k']);
  await assert.rejects(speak({ text: 'x', role: 'narrator', apiKey: '' }), /voice_not_configured/);
  await assert.rejects(speak({ text: 'x', role: 'narrator', apiKey: 'k', fetchImpl: async () => ({ ok: false, status: 429 }) }), /voice_failed_429/);
});

test('no credits left (a 429) still gives a video with music, never a failed video', async (t) => {
  if (!(await explainer.available())) return t.skip('FFmpeg is not installed here');
  const bytes = await explainer.render('buyer-chat', { voice: true, record: async () => { throw new Error('voice_failed_429'); } });
  assert.strictEqual(bytes.slice(4, 8).toString(), 'ftyp');
  assert.ok(bytes.length > 100000);
});

test('with voice, the video has a sound track', async (t) => {
  if (!(await explainer.available())) return t.skip('FFmpeg is not installed here');
  const tone = cp.execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=330:duration=1.2', '-f', 'mp3', 'pipe:1'], { maxBuffer: 5e6 });
  const bytes = await explainer.render('wow-link', { voice: true, record: async () => tone });
  const file = path.join(tmp(), 'v.mp4');
  fs.writeFileSync(file, bytes);
  const info = cp.spawnSync('ffmpeg', ['-hide_banner', '-i', file], { encoding: 'utf8' }).stderr;
  assert.match(info, /Audio: aac/);
  assert.match(info, /Video: h264/);
});

test('the voice option is checked', () => {
  assert.strictEqual(videoOptions({}).explainerVoice, 'off');
  assert.strictEqual(videoOptions({ layout: 'explainer', explainer: 'wow-link', explainerVoice: 'on' }).explainerVoice, 'on');
  assert.throws(() => videoOptions({ explainerVoice: 'loud' }), /valid/);
});

test('the video says it has an AI voice, and still fits the small line', () => {
  assert.strictEqual(explainer.withVoiceDisclosure({ small: 'No card. Send one WOW Link to one agent.' }).small, 'AI voice. No card. Send one WOW Link to one agent.');
  assert.ok(explainer.withVoiceDisclosure({ small: 'x'.repeat(200) }).small.length <= 80);
  assert.strictEqual(explainer.withVoiceDisclosure({}).small, 'AI voice.');
});

// ---- making it sound like a person ----
const clip = (id, at, seconds, maxSeconds) => ({ id, at, seconds, maxSeconds });

test('a line that fits is never sped up and never moved', () => {
  const [a] = fitToTimeline([clip('a', 1, 2, 2.5), clip('b', 5, 1, 2)]);
  assert.deepStrictEqual([a.at, a.maxSpeedup, a.playing, a.overflow], [1, MAX_SPEEDUP, 2, 0]);
});

test('a long line starts a little early, rushes only a little, and never runs over the line before it', () => {
  const out = fitToTimeline([clip('a', 1, 2, 3), clip('b', 6, 5.2, 3)]);
  const b = out[1];
  assert.ok(b.at < 6 && b.at >= 5.55, 'starts at most 0.45s early');
  assert.ok(b.playing >= 5.2 / MAX_SPEEDUP - 0.001, 'rushed by no more than the cap');
  assert.ok(out[0].at + out[0].playing <= b.at, 'the earlier line has finished');
  const tight = fitToTimeline([clip('a', 1, 3.6, 3), clip('b', 4.2, 1, 2)]);
  assert.ok(tight[1].at === 4.2 && tight[0].at >= 0.55, 'the first line may start early, the second stays put');
});

test('the rush cap is gentle (the old setting sped lines up by 30 percent, which is what made it sound robotic)', () => {
  assert.ok(MAX_SPEEDUP <= 1.1);
});

test('the voice treatment trims the silence at both ends and warms the sound', () => {
  assert.match(WARMTH, /silenceremove[^,]*,areverse,silenceremove[^,]*,areverse/);
  assert.match(WARMTH, /equalizer=f=180[^,]*g=2\.5/, 'more body in the low voice');
  assert.match(WARMTH, /equalizer=f=3800[^,]*g=-2\.5/, 'less edge in the upper voice');
  assert.match(WARMTH, /acompressor/);
});

test('the speech request asks for lossless audio, a natural voice and a relaxed, human way of speaking', async () => {
  let body;
  const fetchImpl = async (url, init) => { body = JSON.parse(init.body); return { ok: true, arrayBuffer: async () => new Uint8Array([1]).buffer }; };
  await speak({ text: 'Hi.', role: 'assistant', apiKey: 'k', fetchImpl });
  assert.strictEqual(body.response_format, 'wav');
  assert.deepStrictEqual(Object.values(VOICES).sort(), ['ash', 'cedar', 'marin']);
  assert.match(body.instructions, /real person/);
  assert.match(body.instructions, /not like an announcer/);
  assert.match(body.instructions, /a little slower/);
});
