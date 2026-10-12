-- Found by the Oct 11 bug hunt (second pass). APPLIED to live DB on 2026-10-11 with Chris's OK.
-- All of these were left-over "dev" rules that let anyone (or any logged-in user) read or change other people's rows.
-- The app's own server uses the service role, so none of this affects it. The per-owner policies stay in place.
BEGIN;

-- Anyone could read, edit or delete every knowledge-base entry.
DROP POLICY IF EXISTS "kb_select_dev" ON public.ai_kb;
DROP POLICY IF EXISTS "kb_insert_dev" ON public.ai_kb;
DROP POLICY IF EXISTS "kb_delete_dev" ON public.ai_kb;
DROP POLICY IF EXISTS "Users can read own knowledge base entries" ON public.ai_kb;
DROP POLICY IF EXISTS "Users can insert own knowledge base entries" ON public.ai_kb;
DROP POLICY IF EXISTS "Users can update own knowledge base entries" ON public.ai_kb;
DROP POLICY IF EXISTS "Users can delete own knowledge base entries" ON public.ai_kb;

-- Anyone could read every AI transcript.
DROP POLICY IF EXISTS "public read" ON public.ai_transcripts;
DROP POLICY IF EXISTS "public insert" ON public.ai_transcripts;

-- Anyone on the internet could write a lead straight into the table, skipping consent and spam checks.
-- Real leads go through the server (service role).
DROP POLICY IF EXISTS "leads_public_insert" ON public.leads;

COMMIT;
