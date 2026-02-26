-- Phase 3.5: Billing + entitlements + usage + overage ledger

BEGIN;

CREATE TABLE IF NOT EXISTS public.plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  price_monthly_usd integer NOT NULL DEFAULT 0,
  stripe_price_id text,
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  plan_id text NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text NOT NULL DEFAULT 'free',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  allow_overages boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_status_check CHECK (status IN ('free', 'trialing', 'active', 'past_due', 'canceled', 'incomplete'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_agent_id
  ON public.subscriptions(agent_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id
  ON public.subscriptions(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer
  ON public.subscriptions(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.usage_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  counters jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_periods_agent_period
  ON public.usage_periods(agent_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_usage_periods_subscription
  ON public.usage_periods(subscription_id);

CREATE TABLE IF NOT EXISTS public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  period_id uuid REFERENCES public.usage_periods(id) ON DELETE SET NULL,
  type text NOT NULL,
  units integer NOT NULL DEFAULT 1,
  reference_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT usage_events_type_check CHECK (type IN (
    'listing_published',
    'listing_unpublished',
    'report_generated',
    'reminder_call',
    'lead_captured',
    'sms_message'
  )),
  CONSTRAINT usage_events_units_check CHECK (units >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_events_idempotency_key
  ON public.usage_events(idempotency_key);

CREATE INDEX IF NOT EXISTS idx_usage_events_agent_period
  ON public.usage_events(agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_events_period_id
  ON public.usage_events(period_id);

CREATE TABLE IF NOT EXISTS public.overage_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  period_id uuid REFERENCES public.usage_periods(id) ON DELETE SET NULL,
  type text NOT NULL,
  units integer NOT NULL DEFAULT 1,
  unit_price_usd numeric(10,2) NOT NULL DEFAULT 0,
  amount_usd numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  stripe_invoice_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT overage_ledger_type_check CHECK (type IN ('extra_listing', 'extra_report', 'extra_reminder_call', 'lead_storage_addon', 'sms_overage')),
  CONSTRAINT overage_ledger_status_check CHECK (status IN ('pending', 'invoiced', 'forgiven')),
  CONSTRAINT overage_ledger_units_check CHECK (units >= 1)
);

CREATE INDEX IF NOT EXISTS idx_overage_ledger_agent_period
  ON public.overage_ledger(agent_id, period_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_overage_ledger_status
  ON public.overage_ledger(status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_overage_ledger_idempotency
  ON public.overage_ledger(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  status text NOT NULL DEFAULT 'received',
  CONSTRAINT billing_events_status_check CHECK (status IN ('received', 'processed', 'failed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_events_stripe_event_id
  ON public.billing_events(stripe_event_id);

CREATE INDEX IF NOT EXISTS idx_billing_events_status
  ON public.billing_events(status, received_at DESC);

INSERT INTO public.plans (id, name, price_monthly_usd, stripe_price_id, limits)
VALUES
  (
    'free',
    'Free',
    0,
    NULL,
    jsonb_build_object(
      'active_listings', 1,
      'reports_per_month', 1,
      'reminder_calls_per_month', 0,
      'stored_leads_cap', 25
    )
  ),
  (
    'starter',
    'Starter',
    34,
    NULL,
    jsonb_build_object(
      'active_listings', 5,
      'reports_per_month', 10,
      'reminder_calls_per_month', 0,
      'stored_leads_cap', 250
    )
  ),
  (
    'pro',
    'Pro',
    79,
    NULL,
    jsonb_build_object(
      'active_listings', 25,
      'reports_per_month', 50,
      'reminder_calls_per_month', 200,
      'stored_leads_cap', 2000
    )
  )
ON CONFLICT (id)
DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly_usd = EXCLUDED.price_monthly_usd,
  limits = EXCLUDED.limits;

INSERT INTO public.feature_flags (key, enabled, updated_at)
VALUES
  ('email_enabled', true, now()),
  ('voice_enabled', true, now()),
  ('sms_enabled', false, now())
ON CONFLICT (key)
DO UPDATE SET
  enabled = EXCLUDED.enabled,
  updated_at = now();

COMMIT;
