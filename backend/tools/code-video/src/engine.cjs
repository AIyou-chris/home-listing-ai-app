/**
 * The renderer. A scene is just `draw(ctx, t)`: paint everything that is on
 * screen at time `t` (seconds). This calls it once per frame, hands the raw
 * pixels straight to FFmpeg, and never keeps a frame, so memory stays flat
 * however long the video is.
 *
 * No browser. Drawing uses @napi-rs/canvas (a prebuilt Skia canvas), so there
 * is nothing to install on the server besides npm packages and FFmpeg.
 */
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const v8 = require('node:v8');
const vm = require('node:vm');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const { makeMusicWav } = require('./music.cjs');

/**
 * Every frame's pixels are a few megabytes of native memory that V8 only
 * frees when it next collects garbage, which can be much later. Collecting
 * every dozen frames keeps the process small on a tight server.
 */
function makeCollector() {
  try {
    v8.setFlagsFromString('--expose-gc');
    const gc = vm.runInNewContext('gc');
    return typeof gc === 'function' ? gc : () => {};
  } catch { return () => {}; }
}

/** The size scenes are drawn in. Scenes never see the real pixel size. */
const DESIGN = { width: 720, height: 1280 };

let fontsLoaded = false;
/** Registers the bundled fonts (and any extra { family: path } given). Safe to call repeatedly. */
function loadFonts(extra = {}) {
  const dir = path.join(__dirname, '..', 'fonts');
  if (!fontsLoaded) {
    GlobalFonts.registerFromPath(path.join(dir, 'Anton-Regular.ttf'), 'Anton');
    GlobalFonts.registerFromPath(path.join(dir, 'Inter.ttf'), 'Inter');
    fontsLoaded = true;
  }
  for (const [family, file] of Object.entries(extra)) GlobalFonts.registerFromPath(file, family);
}

function findFfmpeg(explicit) {
  if (explicit) return explicit;
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  if (process.env.FFMPEG_BIN) return process.env.FFMPEG_BIN;
  // ffmpeg-static's file is missing when a server installs packages with scripts switched off, so check it is really there.
  try { const bundled = require('ffmpeg-static'); if (bundled && fs.existsSync(bundled)) return bundled; } catch { /* not installed */ }
  return 'ffmpeg';
}


/** How long an audio file is, in seconds, read from FFmpeg's own report. 0 if it cannot be read. */
function audioSeconds(file, ffmpeg) {
  const out = spawnSync(ffmpeg, ['-hide_banner', '-i', file], { encoding: 'utf8' });
  const m = String(out.stderr || '').match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0;
}

/**
 * The sound: spoken cues placed on the timeline over a music bed that dips
 * while someone is talking. Returns the extra FFmpeg inputs and the filter
 * graph that makes the audio stream `[aout]`.
 *
 *   audio.cues   [{ at: seconds, file: path, maxSeconds?: number, gain?: number }]
 *                A cue longer than maxSeconds is sped up (at most 1.3x) to fit.
 *   audio.music  true, or { mood, gain, seed }. Omit for no music.
 */
function mixAudio({ audio, duration, ffmpeg, dir }) {
  const inputs = []; const parts = [];
  let next = 0;
  const cues = (audio.cues || []).filter(c => c && c.file && c.at >= 0);
  const voiceLabels = [];
  cues.forEach((cue, i) => {
    inputs.push('-i', cue.file);
    const len = audioSeconds(cue.file, ffmpeg);
    const fit = cue.maxSeconds && len > cue.maxSeconds ? Math.min(cue.maxSpeedup ?? 1.3, len / cue.maxSeconds) : 1;
    const ms = Math.round(cue.at * 1000);
    parts.push(`[${next}:a]aformat=sample_rates=44100:channel_layouts=stereo,${fit > 1.01 ? `atempo=${fit.toFixed(3)},` : ''}volume=${cue.gain ?? 1},adelay=${ms}|${ms}[v${i}]`);
    voiceLabels.push(`[v${i}]`);
    next += 1;
  });
  let voice = null;
  if (voiceLabels.length) { parts.push(`${voiceLabels.join('')}amix=inputs=${voiceLabels.length}:normalize=0:duration=longest[voice]`); voice = 'voice'; }

  let music = null;
  if (audio.music) {
    const opts = audio.music === true ? {} : audio.music;
    const wav = path.join(dir, 'music.wav');
    fs.writeFileSync(wav, makeMusicWav({ duration, mood: opts.mood, seed: opts.seed }));
    inputs.push('-i', wav);
    parts.push(`[${next}:a]volume=${opts.gain ?? 0.32},afade=t=out:st=${Math.max(0, duration - 1.6).toFixed(2)}:d=1.6[music]`);
    music = 'music';
  }
  if (!voice && !music) return null;
  if (voice && music) {
    parts.push('[voice]asplit=2[vsc][vout]');
    parts.push('[music][vsc]sidechaincompress=threshold=0.03:ratio=9:attack=15:release=450:makeup=1[ducked]');
    parts.push('[ducked][vout]amix=inputs=2:normalize=0:duration=longest[mix]');
  } else parts.push(`[${voice || music}]anull[mix]`);
  // Brought to a normal loudness for social video (about -15 LUFS) and kept from clipping.
  parts.push(`[mix]loudnorm=I=-15:TP=-1.5:LRA=9,aresample=44100,atrim=0:${duration},apad=whole_dur=${duration}[aout]`);
  const out = path.join(dir, 'mix.wav');
  // A separate, audio-only pass that finishes before any video is drawn, so the
  // two never use memory at the same time.
  const run = spawnSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', ...inputs, '-filter_complex', parts.join(';'), '-map', '[aout]', '-ar', '44100', '-ac', '2', '-t', String(duration), out], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`audio mix failed: ${String(run.stderr).slice(0, 300)}`);
  return out;
}

/**
 * @param {object}   opts
 * @param {Function} opts.draw      (ctx, t) => void, paints one frame
 * @param {number}   opts.duration  seconds
 * @param {string}   opts.out       output .mp4 path
 * @param {number}  [opts.width]    pixels, default 720 (height follows, 9:16)
 * @param {number}  [opts.fps]      default 24
 * @param {string}  [opts.preset]   x264 preset, default veryfast (low memory)
 * @param {number}  [opts.crf]      quality, default 22
 * @param {string}  [opts.ffmpegPath]
 * @param {object}  [opts.audio]    { cues: [{ at, file, maxSeconds, gain }], music: true | { mood, gain, seed } }
 * @param {Function}[opts.onProgress] (frame, total) => void
 */
async function renderVideo({ draw, duration, out, width = 720, fps = 24, preset = 'veryfast', crf = 22, ffmpegPath, audio, onProgress }) {
  if (typeof draw !== 'function') throw new Error('draw must be a function');
  if (!(duration > 0 && duration <= 120)) throw new Error('duration must be between 0 and 120 seconds');
  if (!(width >= 180 && width <= 2160) || width % 2) throw new Error('width must be an even number between 180 and 2160');
  loadFonts();
  const scale = width / DESIGN.width;
  const height = Math.round(DESIGN.height * scale / 2) * 2;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const frames = Math.round(duration * fps);
  const collect = makeCollector();
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });

  const ffmpeg = findFfmpeg(ffmpegPath);
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-video-'));
  const sound = audio ? mixAudio({ audio, duration, ffmpeg, dir: workDir }) : null;
  const encoder = spawn(ffmpeg, [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${width}x${height}`, '-framerate', String(fps), '-i', '-',
    ...(sound ? ['-i', sound, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '128k'] : ['-an']),
    '-c:v', 'libx264', '-threads', '1', '-preset', preset, '-crf', String(crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-t', String(duration), out
  ], { stdio: ['pipe', 'ignore', 'pipe'] });
  let errorText = '';
  encoder.stderr.on('data', chunk => { errorText += chunk; });
  const closed = new Promise((resolve, reject) => {
    encoder.on('error', reject);
    encoder.on('close', code => (code === 0 ? resolve() : reject(new Error(`ffmpeg failed: ${errorText.slice(0, 300)}`))));
  });
  closed.catch(() => {});

  for (let i = 0; i < frames; i += 1) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.scale(scale, scale);
    draw(ctx, i / fps);
    ctx.restore();
    const ok = encoder.stdin.write(canvas.data());
    if (!ok) await new Promise(resolve => encoder.stdin.once('drain', resolve));
    if (i % 12 === 11) collect();
    if (onProgress) onProgress(i + 1, frames);
  }
  encoder.stdin.end();
  try { await closed; } finally { fs.rmSync(workDir, { recursive: true, force: true }); }
  return { out, frames, width, height, fps, duration, audio: Boolean(sound) };
}

/** Paints a single frame and returns it as a PNG buffer. For checking a scene without rendering the video. */
function renderFrame({ draw, t, width = 720 }) {
  loadFonts();
  const scale = width / DESIGN.width;
  const height = Math.round(DESIGN.height * scale / 2) * 2;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  draw(ctx, t);
  return canvas.toBuffer('image/png');
}

module.exports = { renderVideo, renderFrame, loadFonts, DESIGN };
