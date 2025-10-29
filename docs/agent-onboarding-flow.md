# Agent Onboarding & Checkout Flow

This document explains the end‑to‑end onboarding funnel that now powers automated signup, payment, and dashboard provisioning for AI You Agent.

## High-Level Journey

1. **Registration form (`SignUpPage`)**
   - Captures first name, last name, and email.
   - Calls `POST /api/agents/register`.
   - Generates a unique slug (`First_Last`, with numbered suffixes for collisions).
   - Creates a pending `agents` record (`status=pending`, `payment_status=awaiting_payment`).
   - Persists the slug in session storage and redirects to `#/checkout/{slug}`.

2. **Checkout (`CheckoutPage`)**
   - Fetches the agent profile via `GET /api/agents/:slug`.
   - Allows selection of Stripe, PayPal, or “recommended provider”.
   - Requests a hosted checkout link from `POST /api/payments/checkout-session`.
   - Redirects the browser to the provider’s hosted page.

3. **Payment confirmation webhooks**
   - Stripe or PayPal sends a webhook to `POST /api/webhooks/payment-success`.
   - The handler:
     - Updates `agents.status` (`active` or `admin_test`) and `payment_status`.
     - Ensures the agent has a Supabase Auth user (password auto-generated if needed).
     - Persists `auth_user_id` on the agent row.
     - Seeds `dashboards`, `templates`, and `funnels` with default JSON payloads.
     - Sends the welcome email and credential email (Resend/Postmark/SendGrid, with Supabase outbox fallback).

4. **Agent deletion webhook**
   - `POST /api/webhooks/agent-deleted` archives dashboard, funnels, and templates, and marks the agent as deleted.

5. **Dashboard ready state**
   - When the returning browser hits `#/checkout/{slug}?status=success`, `CheckoutPage` polls the agent record via `pollAgentActivation`.
   - On success, the page shows a dashboard deep-link (`https://aiyouagent.com/dashboard/{slug}`) and CTA buttons.

6. **Admin/test bypass**
   - `POST /api/admin/agents/activate` (requires `ADMIN_API_KEY`) marks payment as bypassed and runs the same provisioning flow for manual tests.

## Backend Surface Area

| Endpoint | Purpose |
| --- | --- |
| `POST /api/agents/register` | Register pending agent and return slug/checkout URL. |
| `GET /api/agents/:slug` | Retrieve agent onboarding status (used in checkout). |
| `POST /api/payments/checkout-session` | Create a Stripe or PayPal checkout session/order. |
| `POST /api/webhooks/payment-success` | Stripe/PayPal webhook entry point. |
| `POST /api/webhooks/agent-deleted` | Archive an agent’s assets. |
| `POST /api/admin/agents/activate` | Admin bypass to mark payments as complete. |

### Payment providers
- Stripe support is enabled when `STRIPE_SECRET_KEY` is set. If `STRIPE_PRICE_ID` is missing, the code falls back to a one-time payment using `STRIPE_DEFAULT_AMOUNT_CENTS`.
- PayPal support is enabled when `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` are set. Set `PAYPAL_ENV` to `live` in production.
- The service auto-selects the first available provider, but the UI allows explicit Stripe/PayPal selection.

### Email providers
- Resend, Postmark, and SendGrid are supported. Configure at least one (`RESEND_API_KEY`, `POSTMARK_SERVER_TOKEN`, or `SENDGRID_API_KEY`).
- If none are configured, messages are queued in the Supabase table `email_outbox` for manual delivery.

## Required Supabase Schema

Execute the following migrations (adjust schema names as needed):

```sql
create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null unique,
  slug text not null unique,
  status text not null default 'pending',
  payment_status text not null default 'awaiting_payment',
  auth_user_id uuid,
  last_payment_provider text,
  last_payment_reference text,
  last_payment_amount numeric,
  last_payment_currency text,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  archived_at timestamptz,
  archived_reason text
);

create table if not exists dashboards (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents (id) on delete cascade,
  dashboard_url text not null,
  modules jsonb not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents (id) on delete cascade,
  template_key text not null,
  name text not null,
  channel text not null,
  category text,
  content text not null,
  version integer not null default 1,
  default_version integer not null default 1,
  is_default boolean not null default true,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (agent_id, template_key)
);

create table if not exists funnels (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents (id) on delete cascade,
  funnel_key text not null,
  name text not null,
  description text,
  steps jsonb not null,
  version integer not null default 1,
  default_version integer not null default 1,
  is_default boolean not null default true,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (agent_id, funnel_key)
);

create table if not exists email_outbox (
  id uuid primary key default gen_random_uuid(),
  to text not null,
  cc text[],
  subject text not null,
  body text not null,
  tags jsonb,
  status text not null default 'queued',
  failure_reason text,
  send_after timestamptz not null default now(),
  created_at timestamptz not null default now()
);
```

### Row-Level Security

Recommended policies (enable RLS on each table):

- `agents`:
  - Anonymous insert allowed (only through API) by restricting to service key. For authenticated access, allow `auth.uid() = auth_user_id`.
  - Deny select/update/delete for other users.
- `dashboards`, `funnels`, and `templates`:
  - Allow select/update where `agent_id` resolves to an agent whose `auth_user_id = auth.uid()`.
- `email_outbox`:
  - No public access; only service role should insert/update.

Example policy for `dashboards`:

```sql
create policy "Agents can view their dashboard"
  on dashboards
  for select
  using (
    exists (
      select 1 from agents
      where agents.id = dashboards.agent_id
      and agents.auth_user_id = auth.uid()
    )
  );
```

## Environment Variables Recap

| Variable | Description |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Required for admin auth operations. |
| `DASHBOARD_BASE_URL` / `APP_BASE_URL` | Generates dashboard and checkout return URLs. |
| `RESEND_API_KEY` / `POSTMARK_SERVER_TOKEN` / `SENDGRID_API_KEY` | Transactional email providers (optional but at least one recommended). |
| `EMAIL_FROM_NAME`, `EMAIL_FROM_ADDRESS`, `SUPPORT_EMAIL` | Branding metadata for outgoing emails. |
| `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_PRODUCT_NAME`, `STRIPE_CURRENCY`, `STRIPE_DEFAULT_AMOUNT_CENTS` | Stripe checkout configuration. |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV`, `PAYPAL_CURRENCY` | PayPal order configuration. |
| `ADMIN_API_KEY` | Required header value (`x-admin-key`) for the admin activation endpoint. |

## Testing & Verification

1. **Local quick test**
   - `npm install` (root + `backend/` due to new dependencies).
   - `npm run dev` (frontend) and `npm run dev` inside `backend/`.
   - Complete the signup form → should redirect to checkout page with slug.
   - Click “Use recommended provider” → expect a Stripe (or PayPal) hosted checkout URL if configured, otherwise error message prompting configuration.

2. **Webhook simulation**
   - After signup, call `curl -X POST http://localhost:3002/api/webhooks/payment-success -H "Content-Type: application/json" -d '{"slug":"First_Last","payment_provider":"stripe","payment_reference":"test-ref","metadata":{"admin_bypass":true}}'`
   - The agent record should move to `status=admin_test`, dashboard + templates + funnels should appear, and credentials logged to console or added to `email_outbox`.

3. **Admin bypass**
   - Set `ADMIN_API_KEY` and run `curl -X POST http://localhost:3002/api/admin/agents/activate -H "x-admin-key: <ADMIN_API_KEY>" -H "Content-Type: application/json" -d '{"slug":"First_Last"}'`.

4. **Deletion workflow**
   - `curl -X POST http://localhost:3002/api/webhooks/agent-deleted -H "Content-Type: application/json" -d '{"slug":"First_Last","reason":"Requested account removal"}'`.
   - Verify `dashboards`, `funnels`, and `templates` are marked archived.

5. **Dashboard access**
   - Confirm an auth user exists (`supabase.auth.admin.getUserByEmail`) and log in via Supabase Auth using the emailed temporary password.

## Admin/Test Agent Checklist

When creating a manual test agent (e.g., Chris Potter):

1. Run `POST /api/agents/register` with the desired name/email or insert directly into `agents` with `status='admin_test'` and `payment_status='bypassed'`.
2. Call `/api/admin/agents/activate` with the slug `Chris_Potter`.
3. Confirm the dashboard exists at `https://aiyouagent.com/dashboard/Chris_Potter`.
4. Use Supabase Auth (user metadata includes `first_name`, `last_name`, and `slug`) to log in.
5. Clean up by invoking the deletion webhook when finished so trial data is archived.

## Frontend Notes

- `SignUpPage` now only requests name + email. Passwords are generated server-side after successful payment and delivered by email.
- `CheckoutPage` reads `#/checkout/{slug}` routes, understands `?status=` query parameters, and exposes manual “check status now” polling.
- Registration context is stored in `sessionStorage` under `aiyouagent:agent-registration` so refreshes persist the slug.

## Monitoring

- Payment webhook failures and email fallback insertions are logged to the backend console.
- Consider wiring Stripe/PayPal webhook retries and Supabase `email_outbox` to observability/alerting in production.
