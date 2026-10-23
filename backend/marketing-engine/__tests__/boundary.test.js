const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// The engine is one folder that can be copied to another business. These checks keep it that way:
//  1. nothing inside it (except host.cjs, the one seam) reaches out to the rest of the app, and
//  2. the only outside packages it needs are the ones listed in README.md.
const ENGINE = path.join(__dirname, '..');
const PACKAGES_ALLOWED = new Set(['express', 'openai', 'sharp', '@napi-rs/canvas', 'ffmpeg-static']);

const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out); else if (/\.(js|cjs)$/.test(entry.name)) out.push(full);
  }
  return out;
};
const requires = (file) => [...fs.readFileSync(file, 'utf8').matchAll(/require\(\s*(['"])([^'"]+)\1/g)].map((m) => m[2]);
const sourceFiles = walk(ENGINE).filter((f) => !f.includes(`${path.sep}__tests__${path.sep}`));

test('nothing in the engine reaches outside its folder except host.cjs', () => {
  const leaks = [];
  for (const file of sourceFiles) {
    if (path.basename(file) === 'host.cjs') continue;
    for (const spec of requires(file).filter((s) => s.startsWith('.'))) {
      const target = path.normalize(path.join(path.dirname(file), spec));
      if (!target.startsWith(ENGINE + path.sep)) leaks.push(`${path.relative(ENGINE, file)} -> ${spec}`);
    }
  }
  assert.deepStrictEqual(leaks, [], `These reach into the rest of the app. Go through host.cjs instead:\n${leaks.join('\n')}`);
});

test('host.cjs is the only seam, and it only loads the few listed things', () => {
  const host = fs.readFileSync(path.join(ENGINE, 'host.cjs'), 'utf8');
  const outside = [...host.matchAll(/lazy\('([^']+)', '([^']+)'\)/g)].map((m) => `${m[1]}:${m[2]}`).sort();
  assert.deepStrictEqual(outside, [
    '../services/brandVoice:MARKETING_VOICE_RULES', '../services/brandVoice:findVoiceViolations', '../services/brandVoice:scrubVoice',
    '../services/businessBrain:buildBrainPrompt', '../services/businessBrain:withDefaults',
    '../services/coldEmail/results:computeResults',
    '../services/loBrainService:PLATFORM_BANNED_PHRASES', '../services/loBrainService:PLATFORM_GUARDRAILS'
  ]);
});

test('the outside packages the engine needs are the ones listed in the README', () => {
  const readme = fs.readFileSync(path.join(ENGINE, 'README.md'), 'utf8');
  const used = new Set();
  for (const file of sourceFiles) for (const spec of requires(file)) {
    if (spec.startsWith('.') || spec.startsWith('node:')) continue;
    const name = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
    if (['fs', 'path', 'os', 'crypto', 'child_process', 'util', 'v8', 'vm'].includes(name)) continue;
    used.add(name);
  }
  for (const name of used) {
    assert.ok(PACKAGES_ALLOWED.has(name), `the engine now needs the package "${name}"; add it to this list and to the README`);
    assert.ok(readme.includes(name), `README.md does not list the package "${name}"`);
  }
});

test('the business settings file is inside the engine, so a copy brings its own', () => {
  assert.ok(fs.existsSync(path.join(ENGINE, 'config', 'business.json')));
  assert.ok(fs.existsSync(path.join(ENGINE, 'assets', 'fonts', 'Inter.ttf')));
  assert.ok(fs.existsSync(path.join(ENGINE, 'assets', 'logo.png')));
});
