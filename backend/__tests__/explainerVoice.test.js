const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');
const { recordLines, speak, VOICES } = require('../services/explainerVoice');
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
  assert.deepStrictEqual(cues.map((c) => [c.at, c.maxSeconds]), [[1, 2], [4, 2], [7, 3]]);
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
