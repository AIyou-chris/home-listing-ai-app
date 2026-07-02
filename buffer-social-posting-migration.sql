-- buffer-social-posting-migration.sql
-- Buffer (LinkedIn) social auto-posting. Run once in the Supabase SQL editor.
-- Idempotent: safe to re-run.

-- 1) Guard column so a blog post is only auto-shared to LinkedIn once,
--    on its first transition to `published`.
alter table if exists blog_posts
  add column if not exists social_posted_at timestamptz;

-- 2) Single-row config so the connected channels + auto-post toggle can be
--    chosen from the admin UI (no Render env change needed to pick channels).
--    auto_post_channel_ids = Buffer channel ids to fire to (LinkedIn + any FB pages).
create table if not exists social_config (
  id                    int primary key default 1,
  auto_post_channel_ids jsonb not null default '[]'::jsonb,
  auto_post_blog        boolean not null default true,
  updated_at            timestamptz not null default now(),
  constraint social_config_singleton check (id = 1)
);

insert into social_config (id) values (1)
on conflict (id) do nothing;

-- If an earlier single-channel version of this table already exists, widen it.
alter table if exists social_config
  add column if not exists auto_post_channel_ids jsonb not null default '[]'::jsonb;
