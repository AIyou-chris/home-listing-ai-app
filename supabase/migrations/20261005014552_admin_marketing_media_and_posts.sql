-- Stage three: private campaign pictures and finished videos. Social accounts come later.
create table if not exists public.admin_marketing_media (
  campaign_id uuid not null references public.admin_marketing_campaigns(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('image','video')),
  status text not null check (status in ('processing','ready','failed')),
  source text not null check (source in ('upload','template','ai','render')),
  ai_attempts integer not null default 0 check (ai_attempts between 0 and 3),
  content_hash text not null,
  path text,
  error text,
  token uuid not null,
  updated_at timestamptz not null default now(),
  primary key (campaign_id,kind)
);
create index if not exists admin_marketing_media_owner on public.admin_marketing_media(owner_id);
alter table public.admin_marketing_media enable row level security;
revoke all on public.admin_marketing_media from anon, authenticated;
grant select, insert, update, delete on public.admin_marketing_media to service_role;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('admin-marketing','admin-marketing',false,20971520,array['image/png','image/jpeg','video/mp4'])
on conflict (id) do nothing;
