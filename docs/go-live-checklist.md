# Go-Live Checklist

This page captures the last-mile steps before pointing production clients at Home Listing AI. It bundles the environment-sync, security, validation, and monitoring guidance requested for the new `/api/properties` flow.

## 1. Sync environments & service-role secrets

- **Use the same `SUPABASE_SERVICE_ROLE_KEY` everywhere the backend runs.** Copy `env.example` → `.env.local` for local work, then create the same secret in your staging/prod dashboard (Vercel/Netlify/Heroku/etc) so `backend/server.cjs` can read it via `process.env.SUPABASE_SERVICE_ROLE_KEY`. Do not move that key into the client bundle—only the backend should load it.
- **Confirm the service-role path is enabled.** Your deployment should export `SUPABASE_SERVICE_ROLE_KEY` with the same name as in the server code so `supabaseAdmin` can connect. The server already logs `has service role? true` when this key is present.
- **Check RLS on `properties`.** Row-level security must keep insert/update gated to the service role. From Supabase SQL:
  ```sql
  alter table properties enable row level security;
  create policy "Service role inserts properties"
    on properties
    for insert
    with check (auth.role() = 'service_role');
  ```
  Keep only those policies and any read/update policies that rely on `auth.uid() = agent_id`. Running `SELECT * FROM pg_policies WHERE tablename = 'properties';` before and after deployment is a quick sanity check.

## 2. Backend readiness & security

- **`/api/properties` now sanitizes every payload field and requires an authenticated agent.** The frontend sends the current Supabase `user.id` in the `x-agent-id` header, so the backend can force `agent_id` to match the requester and prevent payload tampering.
- **Verify the endpoint is secured before launching.** Confirm CORS/`helmet` still allow your frontend domain by hitting the endpoint with the production origin and looking for `Access-Control-Allow-Origin`. Example:
  ```bash
  curl -I -H "Origin: https://app.yourdomain.com" https://backend.yourdomain.com/api/properties
  ```
  You should see `Access-Control-Allow-Origin: https://app.yourdomain.com`.
- **Confirm Supabase rejects unauthenticated requests.** With or without an `x-agent-id` header, the backend should enforce authentication and respond with `401` or validation errors rather than leaving the table open.
- **Check the service role isn’t exposed to the browser.** The frontend builds with the anonymous key (`VITE_SUPABASE_ANON_KEY`); the service role key should only live inside backend environments or secret stores and never in public `.env` files served to Vite.

## 3. End-to-end validation

Before releasing to customers, run a full UI → backend cycle:

1. **Create a listing.** Use the Add Listing page/Form and ensure it hits `/api/properties`. Confirm the new property appears in the listing grid and `audit_logs` records `create_property_success`.
2. **Edit persona/knowledge.** Update the agent sidekick and knowledge entries that refer to the new property to prove Supabase writes succeed under RLS and the agent snapshot is respected.
3. **Play audio.** Trigger any audio/voice flows that hit `/api/generate-speech` or the assistant to ensure the same backend is handling both property creation and speech generation without regressions.

Use the latest deployment of both frontend and backend so the header-based authentication and sanitization behave the same as production.

## 4. Monitoring & alerting

- **Tail the backend logs.** On the server host (`tail -f logs/backend.out` locally or `journalctl -u backend` on Linux) and look for entries like `[requestId] Creating property` or `[requestId] Property created`. Each request now emits a `requestId`, so you can grep `requestId` from the console logs to trace a single payload end-to-end.
- **Watch the `security_alerts` table.** Insert failures now create alerts with `alert_type = 'property_create_failure'`. Run:
  ```sql
  select * from security_alerts
    where alert_type = 'property_create_failure'
    order by created_at desc;
  ```
  Use this before/after promoting a build to spot backend rejection spikes.
- **Review `audit_logs`.** Successful and failed property attempts write to `audit_logs` with `action` values like `create_property_success` and `create_property_failure`. Query recent entries to confirm the service role behavior matches expectations.

## 5. Post-release sanity

- **Sync `.env`/backend configs across environments** so that every staging and production host contains the service role key before you flip the frontend toggle. If you rotate keys, redeploy the backend immediately so new values propagate.
- **Document how to debug failures.** Share these monitoring commands with your team, along with the meaning of the new request IDs, so the next person on call can trace `property` inserts quickly.
- **Confirm the go-live checklist often.** Whenever you move to a new Supabase project or change hosting providers, revisit this checklist: env sync, RLS, security headers, end-to-end flow, and log monitoring.
