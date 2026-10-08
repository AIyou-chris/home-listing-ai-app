-- Master on/off switches the admin controls. Everything starts OFF.
create table if not exists admin_switches (
  key text primary key,
  enabled boolean not null default false,
  updated_by text,
  updated_at timestamptz not null default now()
);
alter table admin_switches enable row level security;
insert into admin_switches (key, enabled) values ('cold_email_send', false) on conflict (key) do nothing;

-- A cold-email batch can be based on an approved Marketing Studio campaign.
alter table cold_email_batches add column if not exists marketing_campaign_id uuid;
alter table cold_email_batches add column if not exists theme text;
