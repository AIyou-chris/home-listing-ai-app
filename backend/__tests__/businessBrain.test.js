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
  assert.ok(p.length < 14000 + 3000);
});
