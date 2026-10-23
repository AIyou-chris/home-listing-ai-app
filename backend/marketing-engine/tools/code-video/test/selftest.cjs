const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { renderVideo, renderFrame, templates } = require('../src/index.cjs');

test('a frame is a PNG of the right size', () => {
  const scene = templates['chat-answer'].createScene({});
  const png = renderFrame({ draw: scene.draw, t: 12.6, width: 360 });
  assert.strictEqual(png.slice(1, 4).toString(), 'PNG');
  assert.strictEqual(png.readUInt32BE(16), 360);
  assert.strictEqual(png.readUInt32BE(20), 640);
});

test('a one second video is written as an MP4', async () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cv-')), 'a.mp4');
  const r = await renderVideo({ duration: 1, out, width: 180, draw(ctx, t) { ctx.fillStyle = '#123'; ctx.fillRect(0, 0, 720, 1280); } });
  assert.strictEqual(r.frames, 24);
  assert.strictEqual(fs.readFileSync(out).slice(4, 8).toString(), 'ftyp');
});

test('bad config is refused and long text is cut', () => {
  const { normalizeConfig } = templates['chat-answer'];
  assert.throws(() => normalizeConfig({ options: ['one'] }));
  assert.strictEqual(normalizeConfig({ question: 'x'.repeat(500) }).question.length, 70);
});
