-- Own site analytics: one row per page view or click on the public site. No names, emails or IPs.
-- Run in the Supabase SQL editor.
CREATE TABLE IF NOT EXISTS site_events (
  id bigserial PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL CHECK (type IN ('view', 'click')),
  path text NOT NULL,
  label text,
  visitor_id text,
  referrer_host text,
  device text
);
CREATE INDEX IF NOT EXISTS site_events_created_at_idx ON site_events (created_at DESC);
ALTER TABLE site_events ENABLE ROW LEVEL SECURITY; -- no policies: only the server (service role) can read or write
