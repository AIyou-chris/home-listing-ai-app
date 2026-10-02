#!/usr/bin/env node
'use strict';

// Finds every .from('table').select('a, b, c') in the backend that names a column which
// does not exist in the real database. Supabase swallows those as `data: null`, so they
// fail silently in production.
//
//   node backend/scripts/check-db-columns.cjs --sql     print SQL to paste into the Supabase SQL editor
//   SUPABASE_DB_URL=postgres://... node backend/scripts/check-db-columns.cjs     check directly (exit 1 if any)

const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const files = [path.join(root, 'server.cjs'), ...fs.readdirSync(path.join(root, 'services')).filter((f) => f.endsWith('.js')).map((f) => path.join(root, 'services', f))];
const pattern = /\.from\(\s*'([a-z_0-9]+)'\s*\)\s*\.select\(\s*(['`])([^'`]*)\2/gs;

function collect() {
  const refs = new Map(); // table -> Map(column -> first "file:line")
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(pattern)) {
      let cols = m[3];
      if (cols.includes('${')) continue;
      cols = cols.replace(/[a-z_]+:[a-z_]+\([^)]*\)/g, '').replace(/[a-z_]+\([^)]*\)/g, '');
      const line = src.slice(0, m.index).split('\n').length;
      for (const raw of cols.split(',')) {
        const col = raw.trim();
        if (!/^[a-z_][a-z_0-9]*$/.test(col)) continue;
        if (!refs.has(m[1])) refs.set(m[1], new Map());
        if (!refs.get(m[1]).has(col)) refs.get(m[1]).set(col, `${path.basename(file)}:${line}`);
      }
    }
  }
  return refs;
}

function buildSql(refs) {
  const values = [];
  for (const [table, cols] of refs) for (const col of cols.keys()) values.push(`('${table}','${col}')`);
  return `select table_name, string_agg(col, ',') missing from (select t.t table_name, t.c col from (values ${values.join(',')}) as t(t,c) where not exists (select 1 from information_schema.columns ic where ic.table_schema='public' and ic.table_name=t.t and ic.column_name=t.c)) x group by table_name order by 1;`;
}

async function main() {
  const refs = collect();
  if (process.argv.includes('--sql')) { console.log(buildSql(refs)); return; }
  const url = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!url) {
    console.log('No SUPABASE_DB_URL set. Run with --sql and paste the output into the Supabase SQL editor.');
    return;
  }
  const { Client } = require('pg');
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const { rows } = await client.query(buildSql(refs));
  await client.end();
  if (!rows.length) { console.log(`OK: every selected column exists (${refs.size} tables checked).`); return; }
  for (const row of rows) {
    console.error(`MISSING in ${row.table_name}: ${row.missing}`);
    for (const col of row.missing.split(',')) console.error(`   ${col} first used at ${refs.get(row.table_name).get(col)}`);
  }
  process.exitCode = 1;
}

main().catch((error) => { console.error(error); process.exit(2); });
