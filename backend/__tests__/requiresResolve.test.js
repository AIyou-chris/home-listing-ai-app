const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// A require() of a file that is not there only crashes when the server starts (or when that one route runs). Two moves of files in a row
// each left one behind. This checks every literal relative require in the server and in every folder it mounts (the one-off scripts in scripts/ are left out).
const BACKEND = path.join(__dirname, '..');
const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.cache', 'public', 'scripts'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out); else if (/\.(js|cjs)$/.test(entry.name)) out.push(full);
  }
  return out;
};
const resolves = (from, spec) => {
  const base = path.join(path.dirname(from), spec);
  return ['', '.js', '.cjs', '.json', '/index.js', '/index.cjs'].some((ext) => fs.existsSync(base + ext) && fs.statSync(base + ext).isFile());
};

test('every relative require in the backend points at a file that exists', () => {
  const missing = [];
  for (const file of walk(BACKEND)) {
    if (file.includes(`${path.sep}__tests__${path.sep}`)) continue;
    const source = fs.readFileSync(file, 'utf8');
    for (const m of source.matchAll(/require\(\s*(['"])(\.{1,2}\/[^'"]*)\1/g)) {
      if (!resolves(file, m[2])) missing.push(`${path.relative(BACKEND, file)}: ${m[2]}`);
    }
  }
  assert.deepStrictEqual(missing, [], `These point at files that do not exist:\n${missing.join('\n')}`);
});
