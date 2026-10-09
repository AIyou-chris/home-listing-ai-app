'use strict';
// Chris's rule (2026-10-09): never promise "unlimited", and every place that costs money has a stop.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const server = read('backend/server.cjs');

test('the fetch stop is installed before the OpenAI client and the other SDKs are created', () => {
  const guardAt = server.indexOf('installFetchGuard(');
  const openaiAt = server.indexOf('new OpenAI(');
  assert.ok(guardAt > 0 && openaiAt > guardAt, 'install the fetch guard before new OpenAI(');
});

test('texts, email, reels, document reads, voice previews and AI calls all call a stop', () => {
  assert.ok(read('backend/services/smsService.js').includes('guard.sms('));
  assert.ok(read('backend/services/emailService.js').includes('guard.emailTo('));
  assert.ok(server.includes('guard.reel('));
  assert.ok(server.includes('guard.hoaRead('));
  assert.ok(server.includes('guard.voicePreview('));
  assert.ok(server.includes('allowAiCall:'));
  assert.ok(read('backend/services/loPhoneCallService.js').includes('allowAiCall'));
});

test('no public page, plan list, AI text file or sales prompt promises "unlimited"', () => {
  const files = [
    'index.html', 'public/llms.txt', 'public/ai.txt', 'scripts/generate-seo-pages.mjs', 'src/services/helpSalesChatBot.ts',
    'src/components/ComparePlansModal.tsx', 'src/components/settings/BillingSettings.tsx', 'src/components/LOSignupPage.tsx',
    'src/components/PricingSectionNew.tsx', 'src/components/dashboard-command/BillingCommandPage.tsx', 'src/components/TrialLock.tsx',
    'src/pages/WhiteLabelPage.tsx', 'backend/services/emailService.js'
  ];
  const bad = files.filter((f) => /unlimited/i.test(read(f)));
  assert.deepStrictEqual(bad, [], `Remove "unlimited" from: ${bad.join(', ')}`);
});
