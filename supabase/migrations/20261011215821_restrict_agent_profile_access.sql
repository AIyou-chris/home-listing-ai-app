-- Prepared by the Oct 11 bug hunt. APPLIED to live DB on 2026-10-11 with Chris's OK.
-- Public cards use the server's field-limited /api/agents/:slug response.
BEGIN;
DROP POLICY IF EXISTS "Public can read active agents by slug" ON public.agents;
DROP POLICY IF EXISTS "Admins can view all agents" ON public.agents;
CREATE POLICY "Admins can view all agents" ON public.agents FOR SELECT TO authenticated
USING (public.is_user_admin((SELECT auth.uid())) OR ((SELECT auth.jwt())->'app_metadata' @> '{"admin":true}'::jsonb));

-- Row ownership alone does not protect plan, payment state, usage counters or admin metadata.
-- All account creation/deletion and billing changes already go through the guarded backend.
REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public.agents FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.agents FROM authenticated;
DO $$
DECLARE col record;
BEGIN
  FOR col IN SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'agents'
  LOOP
    EXECUTE format('REVOKE INSERT (%I), UPDATE (%I), SELECT (%I) ON public.agents FROM anon', col.column_name, col.column_name, col.column_name);
    EXECUTE format('REVOKE INSERT (%I), UPDATE (%I) ON public.agents FROM authenticated', col.column_name, col.column_name);
  END LOOP;
END $$;
GRANT UPDATE (first_name, last_name, phone, company, title, bio, website, headshot_url, nmls_number, lending_states, state_license_number, brand_color, brand_logo_url)
ON public.agents TO authenticated;
COMMIT;
