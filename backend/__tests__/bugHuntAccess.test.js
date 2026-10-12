const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const acorn = require('acorn');
const source = fs.readFileSync(require('node:path').join(__dirname, '../server.cjs'), 'utf8');
const ast = acorn.parse(source, { ecmaVersion: 'latest', allowHashBang: true });
const declaration = ast.body.find(n => n.type === 'VariableDeclaration' && n.declarations.some(d => d.id.name === 'resolveRequesterAdminAccess'));
const loadAccess = (db) => vm.runInNewContext(source.slice(declaration.start, declaration.end) + '; resolveRequesterAdminAccess', { supabaseAdmin: db, toTrimmedOrNull: v => String(v || '').trim() || null });
const db = (admin, error = null) => ({
  rpc: async () => ({ data: admin, error }),
  auth: { admin: { getUserById: async () => ({ data: { user: { app_metadata: {} } }, error: null }) } },
  from: () => { const q = { select: () => q, or: () => q, limit: () => q, maybeSingle: async () => ({ data: { metadata: { admin: true, role: 'admin' } }, error: null }) }; return q; }
});

test('editable agent metadata cannot grant access to another owner listing', async () => {
  assert.equal(await loadAccess(db(false))('normal-user'), false);
});
test('server-controlled admin claim permits support access', async () => {
  assert.equal(await loadAccess(db(true))('admin-user'), true);
});
test('admin check failure denies cross-owner access', async () => {
  assert.equal(await loadAccess(db(null, { message: 'unavailable' }))('normal-user'), false);
});

test('legacy payment portal uses the existing Stripe customer column', async () => {
  const node = ast.body.find(n => n.type === 'ExpressionStatement' && n.expression.type === 'CallExpression' && n.expression.arguments[0]?.value === '/api/payments/portal-session');
  const handler = node.expression.arguments.at(-1);
  let selected;
  const query = { select(c) { selected = c; return query; }, eq() { return query; }, maybeSingle: async () => selected.includes('stripe_account_id') ? { data: null, error: { message: 'column does not exist' } } : { data: { id: 'profile', email: 'sample@example.com', stripe_customer_id: 'cus_owned' }, error: null } };
  const fn = vm.runInNewContext('(' + source.slice(handler.start, handler.end) + ')', {
    supabaseAdmin: { from: () => query },
    paymentService: { isConfigured: () => true, createPortalSession: async ({customerId}) => { assert.equal(customerId, 'cus_owned'); return {url:'https://billing.stripe.com/test'}; }, getCustomerByEmail: async () => { throw new Error('must use saved customer'); } },
    console
  });
  let status = 200, body;
  const res = { status(n) { status = n; return res; }, json(v) { body = v; return res; } };
  await fn({authUserId:'login', body:{}}, res);
  assert.equal(status, 200);
  assert.equal(body.success, true);
});


test('public slug lookup never returns billing, login IDs or private metadata', async () => {
  const node = ast.body.find(n => n.type === 'ExpressionStatement' && n.expression.type === 'CallExpression' && n.expression.arguments[0]?.value === '/api/agents/:slug');
  const handler = node.expression.arguments.at(-1);
  const fn = vm.runInNewContext('(' + source.slice(handler.start, handler.end) + ')', {
    agentOnboardingService: { getAgentBySlug: async () => ({ id:'profile', slug:'sample', first_name:'Sample', status:'active', stripe_customer_id:'cus_private', auth_user_id:'login-private', metadata:{private:'secret'}, payment_status:'paid', last_payment_reference:'private' }) }
  });
  let body;
  const res = {json(v) { body=v; }, status() { return res; }};
  await fn({params:{slug:'sample'}},res);
  for(const key of ['stripe_customer_id','auth_user_id','metadata','payment_status','last_payment_reference']) assert.equal(body.agent[key], undefined, key);
  assert.equal(body.agent.slug,'sample');
});


test('editable user role cannot open the admin dashboard', async () => {
  const ts = require('typescript');
  const appSource = fs.readFileSync(require('node:path').join(__dirname, '../../src/App.tsx'), 'utf8');
  const tree = ts.createSourceFile('App.tsx', appSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback;
  const walk = n => { if(ts.isVariableDeclaration(n) && n.name.getText(tree) === 'resolveRoleForSession') callback = n.initializer.arguments[0]; ts.forEachChild(n,walk); };
  walk(tree);
  const text = ts.createPrinter().printNode(ts.EmitHint.Expression,callback,tree);
  const code = ts.transpileModule('const resolve = '+text+'; resolve;', {compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
  const query = {select() {return query;},eq() {return query;}, maybeSingle:async()=>({data:{role:'admin',id:'normal-profile'}})};
  const resolve = vm.runInNewContext(code,{supabase:{rpc:async()=>({data:false}),from:()=>query}});
  assert.equal(await resolve({user:{id:'normal-user',user_metadata:{role:'admin'},app_metadata:{}}}),'agent');
  assert.equal(await resolve({user:{id:'admin',user_metadata:{},app_metadata:{admin:true}}}),'admin');
});


const preQualHandler = (db) => {
  const node = ast.body.find(n => n.type === 'ExpressionStatement' && n.expression.type === 'CallExpression' && n.expression.callee.property?.name === 'post' && n.expression.arguments[0]?.value === '/api/leads/pre-qual');
  const handler = node.expression.arguments.at(-1);
  return vm.runInNewContext('(' + source.slice(handler.start,handler.end) + ')', {
    supabaseAdmin:db, normalizePhoneE164:value=>/^\+1\d{10}$/.test(value)?value:null,
    isListingPublished:row=>row.status==='published', nowIso:()=>new Date().toISOString(), console,
    rateLeadIntent:async()=>{throw new Error('must reject before rating/writing');}
  });
};
test('pre-qual rejects invalid phone-only details before querying or writing', async () => {
  const fn = preQualHandler({from:()=>{throw new Error('must not query');}});
  let status=200; const res={status(n){status=n;return res;},json(){return res;}};
  await fn({body:{listing_id:'listing',full_name:'Buyer',phone:'not-a-phone'}},res);
  assert.equal(status,400);
});
test('pre-qual cannot capture leads on an unpublished listing', async () => {
  const query={select(){return query;},eq(){return query;},limit(){return query;},then(resolve){return Promise.resolve({data:[]}).then(resolve);},maybeSingle:async()=>({data:{id:'listing',status:'draft'}})};
  const fn=preQualHandler({from:()=>query});
  let status=200; const res={status(n){status=n;return res;},json(){return res;}};
  await fn({body:{listing_id:'listing',full_name:'Buyer',email:'buyer@example.com'}},res);
  assert.equal(status,404);
});
