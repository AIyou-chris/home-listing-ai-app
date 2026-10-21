'use strict';
// Which FFmpeg to run. The bundled ffmpeg-static package names a file even when its download was skipped
// (the server installs packages with scripts switched off), so check the file is really there.
const fs = require('fs');

function resolveFfmpeg({ env = process.env, exists = fs.existsSync, bundled = () => require('ffmpeg-static') } = {}) {
  if (env.FFMPEG_BIN) return env.FFMPEG_BIN;
  if (env.FFMPEG_PATH) return env.FFMPEG_PATH;
  try { const file = bundled(); if (file && exists(file)) return file; } catch { /* not installed */ }
  return 'ffmpeg'; // the server's own ffmpeg (the Marketing Studio already uses it)
}

module.exports = { resolveFfmpeg };
