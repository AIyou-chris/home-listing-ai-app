-- Pass A of "everything belongs to a customer". Additive and safe with the old code:
-- adds a nullable owner_id and gives every existing row to the one current owner (Chris, ddee9647-...).
-- Pass B is the code that writes and filters by owner_id. Pass C (owner-scoping-c-migration.sql) swaps the keys.
DO $$
DECLARE
  chris constant uuid := 'ddee9647-fd81-4e54-be9c-dd25e46a99bf';
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'house_social_connections','house_social_oauth_states','admin_switches','house_fb_groups','house_fb_group_posts',
    'lo_prospects','cold_email_batches','cold_email_sends','cold_email_replies','blog_posts','admin_marketing_posts'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS owner_id uuid', t);
    EXECUTE format('UPDATE public.%I SET owner_id = %L WHERE owner_id IS NULL', t, chris);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (owner_id)', t || '_owner_idx', t);
  END LOOP;
END $$;
