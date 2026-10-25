#!/usr/bin/env node
'use strict';
// Set up the marketing engine for ONE customer. Run from the app's root:
//   node backend/marketing-engine/scripts/setup-customer.cjs                 checks the settings file, the environment and the database
//   node backend/marketing-engine/scripts/setup-customer.cjs --enable <id>   also turns the add-on ON for that customer (their login id)
//   node backend/marketing-engine/scripts/setup-customer.cjs --disable <id>  turns it OFF
// It never writes anything unless --enable or --disable is given.
const fs = require('fs');
const path = require('path');
const { business } = require('../config/business');

const TABLES = ['admin_marketing_campaigns', 'admin_marketing_posts', 'admin_switches', 'house_social_connections', 'platform_brain', 'blog_posts'];
const ENV = ['OPENAI_API_KEY', 'MARKETING_TOKEN_ENCRYPTION_KEY', 'SUPABASE_URL'];

async function main() {
  const args = process.argv.slice(2);
  const pick = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : null);
  const problems = []; const ok = [];
  ok.push(`Settings file is valid: ${business.name} (${business.siteUrl})`);
  const logo = path.join(__dirname, '..', 'assets', 'logo.png');
  fs.existsSync(logo) ? ok.push('Logo found') : problems.push('assets/logo.png is missing: put this customer\'s logo there');
  if (business.addon?.required !== true) problems.push('addon.required is false in business.json: set it to true for a copy you sell, or every login gets the add-on');
  for (const name of ENV) process.env[name] ? ok.push(`${name} is set`) : problems.push(`${name} is not set`);

  let db = null;
  const url = process.env.SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (url && key) {
    db = require('@supabase/supabase-js').createClient(url, key);
    for (const table of TABLES) {
      const { error } = await db.from(table).select('owner_id', { head: true, count: 'exact' }).limit(1);
      error ? problems.push(`Table ${table} is not ready (${error.message}). Run the migrations listed in README.md`) : ok.push(`Table ${table} is ready`);
    }
  } else problems.push('No database key in the environment, so the tables were not checked');

  const enable = pick('--enable'); const disable = pick('--disable');
  const who = enable || disable;
  if (who) {
    if (!db) problems.push('Cannot change the add-on without a database key');
    else {
      const { setEntitled } = require('../services/addon');
      await setEntitled(db, who, Boolean(enable), 'setup-customer');
      ok.push(`Add-on turned ${enable ? 'ON' : 'OFF'} for ${who}`);
    }
  }
  console.log(ok.map((x) => `  ok   ${x}`).join('\n'));
  if (problems.length) { console.log(problems.map((x) => `  TODO ${x}`).join('\n')); process.exitCode = 1; } else console.log('\nReady.');
}
main().catch((e) => { console.error(e.message); process.exit(1); });
