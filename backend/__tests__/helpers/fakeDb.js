'use strict';

// A tiny in-memory stand-in for the Supabase client, just enough for the cold-email engine tests.
const JOINS = { lo_prospects: ['prospect_id', 'lo_prospects'], cold_email_batches: ['batch_id', 'cold_email_batches'] };
let counter = 0;

const createFakeDb = (seed = {}) => {
  const tables = {};
  for (const [name, rows] of Object.entries(seed)) tables[name] = rows.map((r) => ({ ...r }));
  const table = (name) => (tables[name] = tables[name] || []);

  const from = (name) => {
    let op = 'select';
    let patch = null;
    let opts = {};
    let selectCols = '*';
    let conflict = null;
    let ignoreDup = false;
    const filters = [];
    let orderBy = null;
    let max = Infinity;
    let wantCount = false;
    let head = false;

    const matches = (row) => filters.every((f) => f(row));
    const attach = (row) => {
      const out = { ...row };
      for (const [rel, [fk, target]] of Object.entries(JOINS)) {
        if (selectCols.includes(`${rel}(`)) out[rel] = table(target).find((t) => t.id === row[fk]) || null;
      }
      return out;
    };

    const run = () => {
      const rows = table(name);
      if (op === 'insert' || op === 'upsert') {
        const list = (Array.isArray(patch) ? patch : [patch]).map((r) => ({ ...r }));
        const inserted = [];
        for (const r of list) {
          const keys = conflict ? conflict.split(',') : null;
          const existing = keys ? rows.find((x) => keys.every((k) => x[k] === r[k])) : null;
          if (existing) {
            if (!ignoreDup) Object.assign(existing, r);
            continue;
          }
          const row = { id: r.id || `id-${++counter}`, created_at: new Date().toISOString(), ...r };
          if (name === 'lo_prospects') { row.unsub_token = row.unsub_token || `tok-${counter}`; row.status = row.status || 'new'; }
          if (name === 'cold_email_sends') { row.check_failures = row.check_failures || []; }
          rows.push(row);
          inserted.push(row);
        }
        return { data: inserted, error: null };
      }
      if (op === 'update') {
        const hit = rows.filter(matches);
        hit.forEach((r) => Object.assign(r, patch));
        return { data: hit, error: null };
      }
      let hit = rows.filter(matches);
      if (orderBy) hit = hit.sort((a, b) => (String(a[orderBy.col]) < String(b[orderBy.col]) ? -1 : 1) * (orderBy.asc ? 1 : -1));
      const total = hit.length;
      hit = hit.slice(0, max).map(attach);
      return { data: head ? null : hit, count: wantCount ? total : null, error: null };
    };

    const api = {
      select(cols = '*', o = {}) { if (op === 'select') selectCols = cols; selectCols = cols; opts = o; wantCount = Boolean(o.count); head = Boolean(o.head); return api; },
      insert(p) { op = 'insert'; patch = p; return api; },
      upsert(p, o = {}) { op = 'upsert'; patch = p; conflict = o.onConflict || null; ignoreDup = Boolean(o.ignoreDuplicates); return api; },
      update(p) { op = 'update'; patch = p; return api; },
      eq(c, v) { filters.push((r) => r[c] === v); return api; },
      in(c, vs) { filters.push((r) => vs.includes(r[c])); return api; },
      lt(c, v) { filters.push((r) => r[c] < v); return api; },
      lte(c, v) { filters.push((r) => String(r[c]) <= String(v)); return api; },
      gte(c, v) { filters.push((r) => String(r[c]) >= String(v)); return api; },
      is(c, v) { filters.push((r) => (v === null ? r[c] == null : r[c] === v)); return api; },
      order(col, o = {}) { orderBy = { col, asc: o.ascending !== false }; return api; },
      limit(n) { max = n; return api; },
      maybeSingle() { const r = run(); return Promise.resolve({ data: (r.data || [])[0] || null, error: null }); },
      single() { const r = run(); return Promise.resolve({ data: (r.data || [])[0] || null, error: null }); },
      then(resolve, reject) { try { resolve(run()); } catch (e) { reject(e); } }
    };
    return api;
  };
  return { from, tables };
};

module.exports = { createFakeDb };
