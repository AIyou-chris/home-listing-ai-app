const test = require('node:test');
const assert = require('node:assert');
const { sanitizeConfig, withDefaults, buildBrainPrompt, DEFAULT_CONFIG } = require('../services/businessBrain');

test('empty input falls back to defaults', () => {
  const c = sanitizeConfig(null);
  assert.strictEqual(c.aiName, DEFAULT_CONFIG.aiName);
  assert.deepStrictEqual(c.sources, []);
});

test('drops empty sources and caps the list', () => {
  const sources = [{ title: 'a', content: '' }, { title: 'b', content: 'hello', type: 'weird' }];
  const c = sanitizeConfig({ sources });
  assert.strictEqual(c.sources.length, 1);
  assert.strictEqual(c.sources[0].type, 'text');
  const many = Array.from({ length: 150 }, (_, i) => ({ title: `t${i}`, content: 'x' }));
  assert.strictEqual(sanitizeConfig({ sources: many }).sources.length, 100);
});

test('blank manager boxes use default wording', () => {
  const c = withDefaults({ sales: '   ' });
  assert.strictEqual(c.sales, DEFAULT_CONFIG.sales);
});

test('prompt includes knowledge and respects the size cap', () => {
  const big = 'k'.repeat(20000);
  const p = buildBrainPrompt({ sources: [{ title: 'Pricing', content: 'LO Lite is $79' }, { title: 'Big', content: big }, { title: 'Late', content: big }] });
  assert.ok(p.includes('[Pricing]'));
  assert.ok(p.includes('LO Lite is $79'));
  assert.ok(p.length < 14000 + 7000);
});

test('brand voice and sales playbook are in the website brain prompt', () => {
  const p = buildBrainPrompt({});
  assert.ok(p.includes('BRAND VOICE'));
  assert.ok(p.includes('HOW YOU SELL'));
});

test('voice checker flags banned words, many exclamation marks and "Attention"', () => {
  const { findVoiceViolations } = require('../services/brandVoice');
  assert.deepStrictEqual(findVoiceViolations('Buyers ask at night. This answers them.'), []);
  const hits = findVoiceViolations('Attention! Our powerful tool effortlessly wins! Wow!');
  assert.ok(hits.includes('powerful'));
  assert.ok(hits.includes('more than one exclamation mark'));
  assert.ok(hits.includes('opens with "Attention"'));
});

test('golden rules: 15 rules, in the website brain, LO brain and listing chat', () => {
  const { GOLDEN_RULES, GOLDEN_RULES_PROMPT } = require('../services/goldenRules');
  assert.strictEqual(GOLDEN_RULES.length, 15);
  assert.ok(buildBrainPrompt({}).includes('AI GOLDEN RULES'));
  const { PLATFORM_GUARDRAILS } = require('../services/loBrainService');
  assert.ok(PLATFORM_GUARDRAILS.includes(GOLDEN_RULES_PROMPT));
  const fs = require('fs');
  assert.ok(fs.readFileSync(require('path').join(__dirname, '../server.cjs'), 'utf8').includes("goldenRules').GOLDEN_RULES_PROMPT"));
});
