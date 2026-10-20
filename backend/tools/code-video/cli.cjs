#!/usr/bin/env node
/**
 * node cli.cjs <template> <out.mp4> [config.json] [--width 720] [--preset veryfast]
 * node cli.cjs --list
 */
const fs = require('node:fs');
const { renderTemplate, templates } = require('./src/index.cjs');

const args = process.argv.slice(2);
const flag = (name, fallback) => { const i = args.indexOf(`--${name}`); if (i === -1) return fallback; const [, v] = args.splice(i, 2); return v; };
const width = Number(flag('width', 720));
const preset = flag('preset', 'veryfast');

if (args.includes('--list') || args.length < 2) {
  console.log(`Templates: ${Object.keys(templates).join(', ')}\nUsage: node cli.cjs <template> <out.mp4> [config.json] [--width 720] [--preset veryfast]`);
  process.exit(args.includes('--list') ? 0 : 1);
}
const [template, out, configPath] = args;
const config = configPath ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
const started = Date.now();
renderTemplate({ template, config, out, width, preset })
  .then(r => console.log(`done: ${r.frames} frames, ${r.width}x${r.height}, ${Math.round((Date.now() - started) / 1000)}s -> ${r.out}`))
  .catch(error => { console.error('FAILED', error.message); process.exit(1); });
