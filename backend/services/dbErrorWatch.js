'use strict';

// Supabase answers a query that names a missing column or table with a 4xx and `data: null`,
// and most of our code swallows that. This wraps fetch so such a failure is LOUD in the logs
// (and in Sentry when configured), once per distinct query every 10 minutes.
// It only observes: the response is returned untouched.

const SCHEMA_CODES = /^(42703|42P01|PGRST100|PGRST200|PGRST204|PGRST205)$/;

function createLoudFetch({ fetchImpl = fetch, report = () => {}, windowMs = 10 * 60 * 1000, now = Date.now } = {}) {
  const lastReported = new Map();
  return async function loudFetch(input, init) {
    const res = await fetchImpl(input, init);
    if (res.status >= 400 && res.status < 500) {
      try {
        const url = typeof input === 'string' ? input : (input && input.url) || String(input);
        if (url.includes('/rest/v1/')) {
          const body = await res.clone().json().catch(() => null);
          const code = body && body.code;
          if (code && SCHEMA_CODES.test(String(code))) {
            const parsed = new URL(url);
            const table = parsed.pathname.split('/rest/v1/')[1] || '';
            const select = parsed.searchParams.get('select') || '';
            const key = `${code}|${table}|${select}`;
            const last = lastReported.get(key) || 0;
            if (now() - last > windowMs) {
              lastReported.set(key, now());
              report({ code, message: body.message || '', hint: body.hint || '', table, select });
            }
          }
        }
      } catch (_error) { /* observing must never break a request */ }
    }
    return res;
  };
}

module.exports = { createLoudFetch };
