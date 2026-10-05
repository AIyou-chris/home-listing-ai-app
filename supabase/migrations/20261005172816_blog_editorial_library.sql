-- Extend the existing blog; no parallel CMS. All initial records remain private drafts/briefs.
alter table public.blog_posts
 add column if not exists short_answer text,
 add column if not exists faq jsonb not null default '[]',
 add column if not exists pillar text,
 add column if not exists role text not null default 'spoke',
 add column if not exists target_keyword text,
 add column if not exists search_intent text,
 add column if not exists hub_slug text,
 add column if not exists related_slugs text[] not null default '{}',
 add column if not exists planned_links text[] not null default '{}',
 add column if not exists author text not null default 'Chris Potter',
 add column if not exists reading_minutes integer,
 add column if not exists compliance_note boolean not null default false,
 add column if not exists scheduled_at timestamptz,
 add column if not exists lead_magnet text,
 add column if not exists generation_attempts integer not null default 0,
 add column if not exists generation_started_at timestamptz,
 add column if not exists review_errors jsonb not null default '[]';
alter table public.blog_posts drop constraint if exists blog_posts_status_check;
alter table public.blog_posts add constraint blog_posts_status_check check(status in ('brief','draft','scheduled','published','archived'));
alter table public.blog_posts enable row level security;
-- Old policies allowed any agent to edit all posts. Admin writes now use the guarded backend only.
drop policy if exists "Admins full access" on public.blog_posts;
drop policy if exists "Admins read all posts" on public.blog_posts;
revoke insert,update,delete on public.blog_posts from anon,authenticated;
create index if not exists blog_posts_due_idx on public.blog_posts(scheduled_at) where status='scheduled';
create index if not exists blog_posts_pillar_idx on public.blog_posts(pillar,status);
create table if not exists public.blog_settings(
 id integer primary key check(id=1),lead_owner_id uuid references auth.users(id),updated_at timestamptz not null default now()
);
alter table public.blog_settings enable row level security;
revoke all on public.blog_settings from anon,authenticated;
grant all on public.blog_settings to service_role;
create table if not exists public.blog_events(
 id bigint generated always as identity primary key,slug text not null,event text not null check(event in ('article_view','scroll_75','cta_click','lead_magnet_signup','trial_start')),created_at timestamptz not null default now()
);
alter table public.blog_events enable row level security;
revoke all on public.blog_events from anon,authenticated;
grant all on public.blog_events to service_role;
grant usage,select on sequence public.blog_events_id_seq to service_role;
create index if not exists blog_events_slug_date_idx on public.blog_events(slug,created_at);
-- Resolve a platform admin from server-controlled claims, never visitor input.
insert into public.blog_settings(id,lead_owner_id)
select 1,id from auth.users where raw_app_meta_data @> '{"claims_admin":true}'::jsonb or raw_app_meta_data @> '{"admin":true}'::jsonb order by created_at limit 1
on conflict(id) do nothing;
alter table public.admin_marketing_campaigns add column if not exists blog_post_id uuid references public.blog_posts(id) on delete set null;
create unique index if not exists admin_marketing_blog_once_idx on public.admin_marketing_campaigns(blog_post_id);
