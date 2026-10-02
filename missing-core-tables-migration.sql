-- Three tables the backend reads and writes that were never created in production.
-- Found 2026-10-02 by checking every .select() column against information_schema.
-- Safe to run more than once. Run it in the Supabase SQL editor.
--
--   appointment_reminders        scheduled reminder rows (dashboard reminder routes, nudges)
--   lead_events                  activity log per lead (captured, deduped, reminder sent, ...)
--   lead_conversation_summaries  Jev/rule summary of a lead's chat (Summary card on the lead page)
--
-- The backend uses the service role, so RLS is enabled with no public policies.

create extension if not exists pgcrypto;

create table if not exists public.appointment_reminders (
  id               uuid primary key default gen_random_uuid(),
  appointment_id   uuid references public.appointments(id) on delete cascade,
  agent_id         uuid,
  lead_id          uuid,
  reminder_type    text not null,
  scheduled_for    timestamptz not null,
  status           text not null default 'pending',
  provider         text,
  provider_response jsonb,
  payload          jsonb not null default '{}'::jsonb,
  idempotency_key  text unique,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists appointment_reminders_due_idx on public.appointment_reminders (status, scheduled_for);
create index if not exists appointment_reminders_appt_idx on public.appointment_reminders (appointment_id);
alter table public.appointment_reminders enable row level security;

create table if not exists public.lead_events (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads(id) on delete cascade,
  type        text not null,
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists lead_events_lead_idx on public.lead_events (lead_id, created_at desc);
alter table public.lead_events enable row level security;

create table if not exists public.lead_conversation_summaries (
  id                 uuid primary key default gen_random_uuid(),
  lead_id            uuid not null unique references public.leads(id) on delete cascade,
  conversation_id    uuid,
  summary_bullets    jsonb not null default '[]'::jsonb,
  last_question      text,
  intent_tags        jsonb not null default '[]'::jsonb,
  timeline           text,
  financing          text,
  working_with_agent text,
  next_best_action   text,
  updated_at         timestamptz not null default now()
);
alter table public.lead_conversation_summaries enable row level security;
