const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const express = require('express');

// A prerendered folder (dist/blog) must never turn /blog into a 301 to /blog/: Netlify strips the
// trailing slash and sends it back, which is a redirect loop. The server code sets redirect:false.
const get = (port, url) => new Promise((resolve, reject) => {
  http.get({ port, path: url }, (res) => { let body = ''; res.on('data', (d) => { body += d; }); res.on('end', () => resolve({ status: res.statusCode, location: res.headers.location, body })); }).on('error', reject);
});

test('a prerendered folder does not redirect, so the live route answers', async () => {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'dist-'));
  fs.mkdirSync(path.join(dist, 'blog'));
  fs.writeFileSync(path.join(dist, 'blog', 'index.html'), 'static');
  const source = fs.readFileSync(path.join(__dirname, '..', 'server.cjs'), 'utf8');
  assert.match(source, /express\.static\(path\.join\(__dirname, '\.\.\/dist'\), \{ redirect: false \}\)/);

  for (const redirect of [true, false]) {
    const app = express();
    app.use(express.static(dist, { redirect }));
    app.get('/blog', (_req, res) => res.send('live route'));
    const server = app.listen(0);
    const port = server.address().port;
    const r = await get(port, '/blog');
    server.close();
    if (redirect) assert.strictEqual(r.status, 301, 'default static redirects (the bug)');
    else { assert.strictEqual(r.status, 200); assert.strictEqual(r.body, 'live route'); }
  }
});
