'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isPrivateIp, assertPublicHttpUrl, safeFetch } = require('../safeUrl');

test('private, loopback, link-local and CGNAT addresses are rejected', () => {
  for (const ip of ['127.0.0.1', '10.0.0.5', '172.16.9.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:10.0.0.1']) {
    assert.equal(isPrivateIp(ip), true, ip);
  }
});

test('ordinary public addresses are allowed', () => {
  for (const ip of ['8.8.8.8', '1.1.1.1', '172.15.0.1', '172.32.0.1', '2606:4700:4700::1111']) {
    assert.equal(isPrivateIp(ip), false, ip);
  }
});

test('assertPublicHttpUrl blocks bad schemes, localhost and private IP literals', async () => {
  for (const u of ['file:///etc/passwd', 'ftp://example.com', 'http://localhost/admin', 'http://127.0.0.1:3002/', 'http://169.254.169.254/latest/meta-data', 'http://[::1]/', 'not a url', 'http://metadata.google.internal/']) {
    await assert.rejects(() => assertPublicHttpUrl(u), /url_not_allowed/, u);
  }
});

test('assertPublicHttpUrl allows a public IP literal', async () => {
  assert.equal(await assertPublicHttpUrl('https://8.8.8.8/x'), 'https://8.8.8.8/x');
});

test('safeFetch re-checks every redirect hop', async () => {
  const calls = [];
  const fakeFetch = async (url) => {
    calls.push(url);
    if (url === 'https://8.8.8.8/start') return { status: 302, headers: { get: () => 'http://169.254.169.254/secret' } };
    return { status: 200, headers: { get: () => null } };
  };
  await assert.rejects(() => safeFetch('https://8.8.8.8/start', {}, 3, fakeFetch), /url_not_allowed/);
  assert.deepEqual(calls, ['https://8.8.8.8/start']);
});

test('safeFetch follows a safe redirect', async () => {
  const fakeFetch = async (url) => (url === 'https://8.8.8.8/a'
    ? { status: 301, headers: { get: () => '/b' } }
    : { status: 200, headers: { get: () => null }, url });
  const res = await safeFetch('https://8.8.8.8/a', {}, 3, fakeFetch);
  assert.equal(res.status, 200);
  assert.equal(res.url, 'https://8.8.8.8/b');
});
