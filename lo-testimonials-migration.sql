-- Testimonial capture (applied to production 2026-07-06 via Supabase MCP —
-- kept here for the record). LOs who are getting leads can submit a quote
-- from the LO Today dashboard (POST /api/lo/testimonial). approved=false
-- until the founder reviews; marketing pages must only show approved rows.

CREATE TABLE IF NOT EXISTS lo_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL UNIQUE,
  display_name text NOT NULL,
  company text,
  quote text NOT NULL,
  approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
