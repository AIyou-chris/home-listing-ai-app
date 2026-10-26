'use strict';
// Animated explainer videos, drawn in code (backend/tools/code-video): free, no paid video AI.
// The scenes and every word in them live in config/business.json under "video", so another business only needs its own file.
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
// Loaded only when a video is made or checked, so the server starts even if the drawing library is missing.
const loadCodeVideo = () => require('../tools/code-video/src/index.cjs');
const { business } = require('../config/business');

const WIDTH = 540; // small and fast; the same size as the picture videos

const sceneNames = (cfg = business) => Object.keys(cfg.video?.scenes || {});
// The scenes a person may pick (a hidden scene, like the listing video's, is used only by its own feature).
const pickableSceneNames = (cfg = business) => sceneNames(cfg).filter((n) => !cfg.video.scenes[n].hidden);

// The scene's template and its words with the business's brand (name, site, colour, button) filled in.
function sceneConfig(name, cfg = business) {
  const scene = cfg.video?.scenes?.[name];
  if (!scene) throw new Error(`There is no explainer video called "${name}".`);
  const template = loadCodeVideo().templates[scene.template];
  if (!template) throw new Error(`Explainer "${name}" uses an unknown template "${scene.template}".`);
  return { template: scene.template, config: { ...(cfg.video.base || {}), ...scene.config } };
}

// Throws a plain error if a scene's words are the wrong shape (used by the settings check and the tests).
function checkScene(name, cfg = business) {
  const { template, config } = sceneConfig(name, cfg);
  const t = loadCodeVideo().templates[template];
  if (typeof t.normalizeConfig === 'function') t.normalizeConfig(config);
  return t.createScene(config).duration;
}

// Every piece of text on screen, for the safety checks.
function sceneText(name, cfg = business) {
  const { config } = sceneConfig(name, cfg);
  const out = [];
  const walk = (v) => { if (typeof v === 'string') out.push(v); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
  walk(config);
  return out;
}

async function available() {
  try {
    const { spawnSync } = require('child_process');
    const ffmpeg = process.env.FFMPEG_PATH || process.env.FFMPEG_BIN || 'ffmpeg';
    return spawnSync(ffmpeg, ['-version'], { timeout: 5000 }).status === 0;
  } catch { return false; }
}

const withVoiceDisclosure = (config) => ({ ...config, small: `AI voice. ${config.small || ''}`.trim().slice(0, 80) });

// What the video will say, without drawing it: the final words (following the post, if given) and every spoken line.
function plan(name, { post = null, words = null, cfg = business } = {}) {
  const scene = sceneConfig(name, cfg);
  const matched = post ? { ...scene.config, ...require('./explainerMatch').matchPost({ template: scene.template, post }) } : scene.config;
  const config = words ? { ...matched, ...words } : matched;
  const spoken = loadCodeVideo().templates[scene.template].narration(config);
  return { template: scene.template, config, spoken };
}

// Makes the video and returns the MP4 bytes.
// `post` ({ outputs, brief }) makes it follow its campaign: the post's title and first sentence become the opening and closing words.
// `voice` adds a spoken voice (about a cent): if the voice cannot be made, the video is made with music only.
async function render(name, { width = WIDTH, music = true, voice = false, post = null, words = null, record, cfg = business } = {}) {
  const scene = sceneConfig(name, cfg);
  const { template } = scene;
  let config = post ? { ...scene.config, ...require('./explainerMatch').matchPost({ template, post }) } : scene.config;
  if (words) config = { ...config, ...words };
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hlai-explainer-'));
  try {
    const cv = loadCodeVideo();
    const audio = {};
    if (music && cfg.video?.music) audio.music = cfg.video.music;
    if (voice) {
      const lines = cv.templates[template].narration(config);
      const cues = await require('./explainerVoice').recordLines({ lines, dir, ...(record ? { record } : {}) });
      if (cues.length) {
        audio.cues = cues;
        // The spoken voice is AI, and the video says so.
        config = withVoiceDisclosure(config);
      }
    }
    const out = path.join(dir, 'explainer.mp4');
    await cv.renderTemplate({ template, config, out, width, preset: 'veryfast', ...(audio.music || audio.cues ? { audio } : {}) });
    return await fs.readFile(out);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
}

// A real, tiny end-to-end test: draw one second, encode it, check it is an MP4. Cached for ten minutes so it is cheap to ask.
let lastCheck = null;
async function selfCheck({ force = false, now = Date.now() } = {}) {
  if (!force && lastCheck && now - lastCheck.at < 10 * 60000) return lastCheck.result;
  const result = { ok: false, ffmpeg: false, drawing: false, error: null };
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hlai-explainer-check-'));
  try {
    result.ffmpeg = await available();
    if (!result.ffmpeg) throw new Error('FFmpeg is not installed on this server.');
    const cv = loadCodeVideo();
    result.drawing = true;
    const out = path.join(dir, 'check.mp4');
    await cv.renderVideo({ duration: 1, out, width: 180, draw(ctx) { ctx.fillStyle = '#123'; ctx.fillRect(0, 0, 720, 1280); } });
    const head = (await fs.readFile(out)).subarray(4, 8).toString();
    if (head !== 'ftyp') throw new Error('The test video was not a real MP4.');
    result.ok = true;
  } catch (error) {
    result.error = String(error?.message || error).slice(0, 200);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
  lastCheck = { at: now, result };
  return result;
}

module.exports = { render, plan, available, selfCheck, withVoiceDisclosure, sceneNames, pickableSceneNames, sceneConfig, sceneText, checkScene, WIDTH };
