-- Private drafts only. No publish job, public policy or paid API call.
create table if not exists public.admin_marketing_images (
 id uuid primary key, owner_id uuid not null references auth.users(id) on delete cascade,
 campaign_id uuid references public.admin_marketing_campaigns(id) on delete set null,
 group_id uuid not null, sample_key text, brand text not null, format text not null,
 prompt text not null, recipe_id text not null, mood text not null, text_zone text not null,
 variant integer not null, alt_text text not null, cost numeric not null default 0,
 width integer not null, height integer not null, path text not null, background_path text not null,
 source_hash text not null, background_fingerprint text, settings jsonb not null default '{}', checks jsonb not null default '{}',
 approved boolean not null default false, review jsonb not null default '{}', used_in jsonb not null default '[]',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists admin_marketing_images_owner_recent on public.admin_marketing_images(owner_id,created_at desc);
create unique index if not exists admin_marketing_images_owner_sample on public.admin_marketing_images(owner_id,sample_key) where sample_key is not null;
alter table public.admin_marketing_images enable row level security;
revoke all on public.admin_marketing_images from anon,authenticated;
grant select,insert,update,delete on public.admin_marketing_images to service_role;
alter table public.blog_events add column if not exists marketing_image_id uuid references public.admin_marketing_images(id) on delete set null;
create index if not exists blog_events_marketing_image on public.blog_events(marketing_image_id);
update storage.buckets set allowed_mime_types=array['image/png','image/jpeg','image/webp','image/avif','video/mp4','audio/mpeg'] where id='admin-marketing';
