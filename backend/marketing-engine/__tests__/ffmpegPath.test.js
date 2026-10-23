const test = require('node:test');
const assert = require('node:assert');
const { resolveFfmpeg } = require('../services/ffmpegPath');

test('an ffmpeg set by the server settings wins', () => {
  assert.strictEqual(resolveFfmpeg({ env: { FFMPEG_BIN: '/opt/ff' }, exists: () => false, bundled: () => '/b' }), '/opt/ff');
  assert.strictEqual(resolveFfmpeg({ env: { FFMPEG_PATH: '/opt/ff2' }, exists: () => false, bundled: () => '/b' }), '/opt/ff2');
});

test('the bundled ffmpeg is used only when its file is really there', () => {
  assert.strictEqual(resolveFfmpeg({ env: {}, exists: () => true, bundled: () => '/b/ffmpeg' }), '/b/ffmpeg');
});

test('a bundled path with no file behind it falls back to the server ffmpeg (the bug that kept reels off)', () => {
  assert.strictEqual(resolveFfmpeg({ env: {}, exists: () => false, bundled: () => '/missing/ffmpeg' }), 'ffmpeg');
  assert.strictEqual(resolveFfmpeg({ env: {}, exists: () => true, bundled: () => { throw new Error('not installed'); } }), 'ffmpeg');
});
