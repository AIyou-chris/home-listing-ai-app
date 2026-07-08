-- ═══════════════════════════════════════════════════════════════════════════
-- RLS HARDENING — applied to Supabase (project yocchddxdsaldgsibmmc) on
-- 2026-07-08 via MCP as migrations `rls_hardening_41_tables` and
-- `rls_initplan_perf_fix`. Kept here for the repo record — DO NOT re-run
-- blindly; both parts are idempotent-safe but already live.
--
-- Context: a security scan found 41 public tables with RLS disabled while the
-- anon/authenticated roles held full CRUD grants — anyone with the public API
-- key could read/write billing_events, subscriptions, profiles, plans, etc.
-- The backend always uses the service-role key (bypasses RLS), and the
-- frontend only reads public.profiles directly (own-row role lookup in
-- src/App.tsx), so deny-all + one profiles SELECT policy is a zero-impact fix.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Part 1: enable RLS on the 41 exposed tables ─────────────────────────────
ALTER TABLE public.agent_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_sidekick_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_sidekick_training_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_sidekicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_step_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_funnel_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_video_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lo_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_followup_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_qr_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbound_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overage_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequence_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Frontend role lookup (src/App.tsx) reads the signed-in user's own row.
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (select auth.uid()));

-- Views ran with owner privileges (bypasses RLS); neither is referenced in the
-- app code — switch to caller privileges.
ALTER VIEW public.v_ai_conversation_messages SET (security_invoker = on);
ALTER VIEW public.contact_stats SET (security_invoker = on);

-- ── Part 2: perf — auth_rls_initplan fix (255 policies across 82 tables) ────
-- Wraps auth.uid()/auth.role()/auth.jwt() in scalar subselects so Postgres
-- evaluates them once per query instead of once per row.
DO $$
DECLARE
  p record;
  new_qual text;
  new_check text;
  stmt text;
  fixed int := 0;
  skipped int := 0;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (qual IS NOT NULL AND qual ~ 'auth\.(uid|role|jwt)\(\)' AND qual !~ '\( *SELECT auth\.(uid|role|jwt)\(\)')
        OR
        (with_check IS NOT NULL AND with_check ~ 'auth\.(uid|role|jwt)\(\)' AND with_check !~ '\( *SELECT auth\.(uid|role|jwt)\(\)')
      )
  LOOP
    BEGIN
      new_qual := p.qual;
      new_check := p.with_check;

      IF new_qual IS NOT NULL THEN
        new_qual := replace(new_qual, '( SELECT auth.uid() AS uid)', '__WUID__');
        new_qual := replace(new_qual, '( SELECT auth.role() AS role)', '__WROLE__');
        new_qual := replace(new_qual, '( SELECT auth.jwt() AS jwt)', '__WJWT__');
        new_qual := replace(new_qual, 'auth.uid()', '( SELECT auth.uid() )');
        new_qual := replace(new_qual, 'auth.role()', '( SELECT auth.role() )');
        new_qual := replace(new_qual, 'auth.jwt()', '( SELECT auth.jwt() )');
        new_qual := replace(new_qual, '__WUID__', '( SELECT auth.uid() )');
        new_qual := replace(new_qual, '__WROLE__', '( SELECT auth.role() )');
        new_qual := replace(new_qual, '__WJWT__', '( SELECT auth.jwt() )');
      END IF;

      IF new_check IS NOT NULL THEN
        new_check := replace(new_check, '( SELECT auth.uid() AS uid)', '__WUID__');
        new_check := replace(new_check, '( SELECT auth.role() AS role)', '__WROLE__');
        new_check := replace(new_check, '( SELECT auth.jwt() AS jwt)', '__WJWT__');
        new_check := replace(new_check, 'auth.uid()', '( SELECT auth.uid() )');
        new_check := replace(new_check, 'auth.role()', '( SELECT auth.role() )');
        new_check := replace(new_check, 'auth.jwt()', '( SELECT auth.jwt() )');
        new_check := replace(new_check, '__WUID__', '( SELECT auth.uid() )');
        new_check := replace(new_check, '__WROLE__', '( SELECT auth.role() )');
        new_check := replace(new_check, '__WJWT__', '( SELECT auth.jwt() )');
      END IF;

      stmt := format('ALTER POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
      IF new_qual IS NOT NULL THEN
        stmt := stmt || format(' USING (%s)', new_qual);
      END IF;
      IF new_check IS NOT NULL THEN
        stmt := stmt || format(' WITH CHECK (%s)', new_check);
      END IF;

      EXECUTE stmt;
      fixed := fixed + 1;
    EXCEPTION WHEN OTHERS THEN
      skipped := skipped + 1;
      RAISE NOTICE 'Skipped policy % on %.%: %', p.policyname, p.schemaname, p.tablename, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'RLS initplan fix: % policies rewritten, % skipped', fixed, skipped;
END $$;
