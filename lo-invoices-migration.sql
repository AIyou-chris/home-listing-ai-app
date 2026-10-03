-- Loan officer -> agent invoices (idempotent; run once in the Supabase SQL editor).
-- HomeListingAI only creates, emails and tracks these. It never handles the payment:
-- the agent pays the loan officer directly, and the loan officer marks the invoice paid.
--
-- lo_agent_id  = the loan officer's agents.id (PROFILE id, same as lo_agent_partnerships).
-- agent_id     = the recipient's agents.id when they have an account (nullable: the invoice
--                goes to an email address and works before the agent signs up).
-- The lo_* columns are a snapshot so an old invoice never changes when the LO edits their profile.

CREATE TABLE IF NOT EXISTS lo_agent_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lo_agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  agent_email text NOT NULL,
  agent_name text,
  listing_id uuid,
  listing_address text,
  invoice_number text NOT NULL,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_cents integer NOT NULL CHECK (total_cents > 0),
  due_date date,
  payment_instructions text,
  note text,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'paid', 'void')),
  token text NOT NULL UNIQUE,
  lo_name text,
  lo_company text,
  lo_nmls text,
  lo_email text,
  lo_phone text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  email_sent boolean NOT NULL DEFAULT false,
  first_viewed_at timestamptz,
  last_viewed_at timestamptz,
  view_count integer NOT NULL DEFAULT 0,
  paid_at timestamptz,
  voided_at timestamptz,
  last_reminder_at timestamptz,
  reminder_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS lo_agent_invoices_number_idx ON lo_agent_invoices (lo_agent_id, invoice_number);
CREATE INDEX IF NOT EXISTS lo_agent_invoices_lo_idx ON lo_agent_invoices (lo_agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lo_agent_invoices_agent_idx ON lo_agent_invoices (agent_id);
CREATE INDEX IF NOT EXISTS lo_agent_invoices_email_idx ON lo_agent_invoices (lower(agent_email));

-- Backend only (service role). No policies = no direct browser access.
ALTER TABLE lo_agent_invoices ENABLE ROW LEVEL SECURITY;
