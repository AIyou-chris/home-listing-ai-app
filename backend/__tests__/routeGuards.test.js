'use strict';

// Fails the build when someone adds an /api route with no login guard that is not on the
// reviewed allowlist. This is the check that would have caught open email/SMS/call/delete routes.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');
const allowlist = require('./publicRoutes.allowlist');

const GUARD_NAMES = /^(requireAuth|requireLoAgent|requireOffice|verifyAdmin|requireParamOwner|requireLeadOwner|requireConversationAccess|requireNamedUserIsCaller|requireSidekickOwner)$/;
const GUARD_CALL = /(requireAuth|requireLoAgent|requireOffice|verifyAdmin)\(/;
const SAFE_INSIDE = /resolveDashboardOwnerId|resolveRequesterUserId|resolveLoAgentId|resolveBillingAgentId|appointmentOwnerIds|resolveOfficeContext|ownedAppointment|ownsNotificationSettings|resolveAgentIdForRequesterUser|auth\.getUser|authorization/i;

function findUnguardedRoutes() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'server.cjs'), 'utf8');
  const ast = acorn.parse(src, { ecmaVersion: 'latest', allowHashBang: true, allowReturnOutsideFunction: true });
  const found = new Set();
  const all = new Set();
  for (const node of ast.body) {
    if (node.type !== 'ExpressionStatement' || node.expression.type !== 'CallExpression') continue;
    const call = node.expression;
    if (call.callee.type !== 'MemberExpression' || call.callee.object.name !== 'app') continue;
    const method = call.callee.property.name;
    if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
    const first = call.arguments[0];
    if (!first) continue;
    const paths = first.type === 'Literal' ? [first.value] : first.type === 'ArrayExpression' ? first.elements.map((e) => e && e.value) : [];
    const middleware = call.arguments.slice(1, -1);
    const guarded = middleware.some((m) => (m.type === 'Identifier' && GUARD_NAMES.test(m.name))
      || (m.type === 'ArrowFunctionExpression' && GUARD_CALL.test(src.slice(m.start, m.end))));
    const insideSafe = SAFE_INSIDE.test(src.slice(node.start, node.end));
    for (const p of paths) {
      if (typeof p !== 'string' || !p.startsWith('/api/')) continue;
      all.add(`${method.toUpperCase()} ${p}`);
      if (!guarded && !insideSafe) found.add(`${method.toUpperCase()} ${p}`);
    }
  }
  return { unguarded: found, all };
}

test('no /api route is open unless it is on the reviewed allowlist', () => {
  const { unguarded } = findUnguardedRoutes();
  const allowed = new Set(allowlist);
  const newlyOpen = [...unguarded].filter((r) => !allowed.has(r)).sort();
  assert.deepEqual(newlyOpen, [], `These routes have no login guard and are not on the allowlist (backend/__tests__/publicRoutes.allowlist.js):\n  ${newlyOpen.join('\n  ')}`);
});

test('the allowlist has no stale entries', () => {
  const { all } = findUnguardedRoutes();
  const stale = allowlist.filter((r) => !all.has(r)).sort();
  assert.deepEqual(stale, [], `Remove these from the allowlist, the routes no longer exist:\n  ${stale.join('\n  ')}`);
});

test('money, mail, calls and deletes can never be on the allowlist', () => {
  const never = [/\/email\/send/, /\/sms\/send/, /outbound-call/, /\/vapi\/call/, /\/shorten/, /reset-agent/, /portal-session/, /notify-login/, /generate-listing/, /agent-chat/, /score-all/];
  const bad = allowlist.filter((r) => never.some((rx) => rx.test(r)));
  assert.deepEqual(bad, [], `These must stay behind a login: ${bad.join(', ')}`);
});
