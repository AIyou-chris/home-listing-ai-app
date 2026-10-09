'use strict';
// A Supabase query builder has `then` but no `catch`. `.catch()` on it throws AFTER the write happened and
// turns a best-effort step into a 500. Found on the buyer lead-capture path in the 2026-10-08 audit
// (the LO's new-lead bell), where it broke the response to the buyer. Use bestEffort(query) instead.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'server.cjs'), 'utf8');

test('no .catch() directly on a supabase query builder', () => {
  const offenders = [];
  const re = /supabase(?:Admin)?\s*\.from\(/g;
  let m;
  while ((m = re.exec(src))) {
    const start = m.index;
    let depth = 0;
    let i = start;
    while (i < src.length) {
      const c = src[i];
      if (c === '(' || c === '[' || c === '{') depth++;
      else if (c === ')' || c === ']' || c === '}') depth--;
      else if (c === ';' && depth <= 0) break;
      else if (c === '\n' && depth <= 0 && !/^\s*\./.test(src.slice(i + 1, i + 80))) break;
      i++;
    }
    const stmt = src.slice(start, i);
    const before = src.slice(Math.max(0, start - 60), start);
    if (/bestEffort\(|Promise\.resolve\(/.test(before)) continue;
    // top-level text only (nested calls blanked out) so a .catch on an inner helper does not count
    let depth2 = 0;
    let top = '';
    for (const ch of stmt) {
      if (ch === '(') { depth2++; top += '('; continue; }
      if (ch === ')') { depth2--; top += ')'; continue; }
      top += depth2 === 0 ? ch : ' ';
    }
    const catchAt = top.search(/\.\s*catch\s*\(/);
    const thenAt = top.search(/\.\s*then\s*\(/);
    if (catchAt !== -1 && (thenAt === -1 || thenAt > catchAt)) {
      offenders.push(`line ${src.slice(0, start).split('\n').length}: ${stmt.slice(0, 70).replace(/\s+/g, ' ')}`);
    }
  }
  // The only allowed mention is the explanatory comment above bestEffort (not a real query).
  const real = offenders.filter((o) => !o.includes('(..)'));
  assert.deepStrictEqual(real, [], `Use bestEffort() instead of .catch() on a supabase builder:\n${real.join('\n')}`);
});
