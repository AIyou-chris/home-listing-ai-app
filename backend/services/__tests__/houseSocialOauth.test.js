'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { providerStatus, authorizeUrl, newVerifier, callbackUri, PLATFORMS } = require('../houseSocialOauth');
const { encryptToken, decryptToken } = require('../tokenCrypto');
const { studioReturn } = require('../houseSocialStore');

const env = {
  PUBLIC_SITE_ORIGIN: 'https://homelistingai.com/', MARKETING_TOKEN_ENCRYPTION_KEY: 'a'.repeat(64),
  META_APP_ID: 'm1', META_APP_SECRET: 'm2', META_GRAPH_VERSION: 'v21.0',
  SOCIAL_GOOGLE_CLIENT_ID: 'g1', SOCIAL_GOOGLE_CLIENT_SECRET: 'g2', LINKEDIN_CLIENT_ID: 'l1', LINKEDIN_CLIENT_SECRET: 'l2'
};

test('four platforms are offered', () => assert.deepEqual(PLATFORMS, ['facebook', 'instagram', 'youtube', 'linkedin']));

test('the return address uses the public site, so the browser lands on homelistingai.com', () => {
  assert.equal(callbackUri('linkedin', env), 'https://homelistingai.com/api/marketing/oauth/linkedin/callback');
});

test('missing keys are named, not guessed', () => {
  assert.equal(providerStatus('linkedin', { ...env, LINKEDIN_CLIENT_SECRET: '' }).missing, 'Platform app keys');
  assert.equal(providerStatus('linkedin', { ...env, MARKETING_TOKEN_ENCRYPTION_KEY: '' }).missing, 'Secure token storage');
  assert.equal(providerStatus('linkedin', env).configured, true);
});

test('consent links carry our state and return address', () => {
  for (const platform of PLATFORMS) {
    const url = new URL(authorizeUrl(platform, { state: 'abc123', codeVerifier: newVerifier(), env }));
    assert.equal(url.searchParams.get('state'), 'abc123');
    assert.equal(url.searchParams.get('redirect_uri'), `https://homelistingai.com/api/marketing/oauth/${platform}/callback`);
  }
});

test('tokens are encrypted and round-trip', () => {
  process.env.MARKETING_TOKEN_ENCRYPTION_KEY = 'b'.repeat(64);
  const stored = encryptToken('secret-token');
  assert.notEqual(stored, 'secret-token');
  assert.equal(decryptToken(stored), 'secret-token');
});

test('the admin lands back on the Marketing Funnels page', () => {
  assert.equal(studioReturn('facebook', 'connected'), '/admin/marketing-funnels?social=facebook&result=connected');
});
