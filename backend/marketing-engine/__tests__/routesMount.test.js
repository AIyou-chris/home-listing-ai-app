const test = require('node:test');
const assert = require('node:assert');
const { mount } = require('../routes.cjs');

// Mounting must work with only the documented host pieces, and every admin route must sit behind the login guard.
function fakeApp() {
  const routes = [];
  const add = (method) => (path, ...handlers) => routes.push({ method, path, handlers });
  return { routes, get: add('get'), post: add('post'), put: add('put'), patch: add('patch'), delete: add('delete'), use() {} };
}
const verifyAdmin = (req, res, next) => next();
const deps = (over = {}) => ({
  verifyAdmin, supabaseAdmin: null, openai: null, loadBusinessBrain: async () => ({}), createJevClient: () => ({}), blogService: {}, emailService: { sendEmail: async () => {} },
  APP_RUNTIME_MODE: 'worker', // no timers in a test
  ...over
});

test('mount registers the marketing routes with only the documented host pieces', () => {
  const app = fakeApp();
  mount(app, deps());
  const paths = app.routes.map((r) => `${r.method.toUpperCase()} ${r.path}`);
  for (const expected of [
    'GET /api/admin/marketing-studio/campaigns', 'POST /api/admin/marketing-studio/campaigns/:id/video', 'POST /api/admin/marketing-studio/campaigns/:id/video-review',
    'GET /api/admin/house-social/connections', 'GET /api/marketing/oauth/:platform/callback', 'PUT /api/admin/marketing-studio/campaigns/:id/posts',
    'GET /api/admin/autopilot', 'POST /api/admin/autopilot', 'GET /api/admin/today', 'GET /api/admin/video-check', 'GET /api/admin/marketing-analytics'
  ]) assert.ok(paths.includes(expected), `missing ${expected}`);
  assert.ok(app.routes.length >= 40, `expected the full set of routes, got ${app.routes.length}`);
});

test('every admin route is behind the login guard; the only open route is the social login callback and the public picture link', () => {
  const app = fakeApp();
  mount(app, deps());
  const open = app.routes.filter((r) => !r.handlers.slice(0, -1).includes(verifyAdmin)).map((r) => `${r.method.toUpperCase()} ${r.path}`).sort();
  assert.deepStrictEqual(open, ['GET /api/marketing/oauth/:platform/callback', 'GET /api/public/marketing-images/:id']);
});

test('a worker-only server starts no timers; a web server starts the posting and Autopilot timers', () => {
  const real = global.setInterval; const made = [];
  global.setInterval = (fn, ms) => { made.push(ms); return { unref() {} }; };
  try {
    mount(fakeApp(), deps({ APP_RUNTIME_MODE: 'worker' }));
    assert.deepStrictEqual(made, []);
    mount(fakeApp(), deps({ APP_RUNTIME_MODE: 'all' }));
    assert.deepStrictEqual(made.sort((a, b) => a - b), [5 * 60 * 1000, 10 * 60 * 1000]);
  } finally { global.setInterval = real; }
});

test('the engine front door loads', () => {
  const engine = require('../index.cjs');
  assert.strictEqual(typeof engine.mount, 'function');
  assert.strictEqual(engine.business.name, 'HomeListingAI');
  assert.strictEqual(typeof engine.directVideo, 'function');
});
