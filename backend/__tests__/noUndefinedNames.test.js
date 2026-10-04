'use strict';

// A name used but never created (a typo, or a variable a refactor removed) only crashes when that
// exact request runs. This catches them at build time. Two such bugs reached production:
// `constaudienceType` (admin broadcast) and `brandName` (Share Kit social image).
//
// The names below are known and harmless. If you add a new one to this list, say why.
const KNOWN_HARMLESS = new Set([
  'document', // runs inside the headless browser that renders PDFs and images, where it exists
  'PORT', // laptop-only fallback address, only reached when no public base URL is set
  'ensureLocalConversations', // no-database dev fallback, behind useLocalConversationStore (off in production)
  'ensureLocalMessages',
  'respondWithLocalConversations',
  'localAiCardStore' // no-database dev fallback, behind useLocalAiCardStore (off in production)
]);

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { ESLint } = require('eslint');

test('server.cjs uses no undefined names beyond the known harmless ones', async () => {
  const eslint = new ESLint({
    useEslintrc: false,
    overrideConfig: {
      env: { node: true, es2022: true },
      parserOptions: { ecmaVersion: 2022 },
      rules: { 'no-undef': 'error' }
    }
  });
  const [result] = await eslint.lintFiles([path.join(__dirname, '..', 'server.cjs')]);
  const unexpected = result.messages
    .filter((m) => m.ruleId === 'no-undef')
    .map((m) => ({ name: /'([^']+)'/.exec(m.message)?.[1], line: m.line }))
    .filter((m) => !KNOWN_HARMLESS.has(m.name));
  assert.deepEqual(unexpected, [], `These names are used but never defined (typo or removed variable):\n${unexpected.map((u) => `  ${u.name} at server.cjs:${u.line}`).join('\n')}`);
});
