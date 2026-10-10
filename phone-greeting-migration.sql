-- Lets the LO write their own phone greeting. Additive and safe to re-run.
alter table public.lo_chatbot_configs add column if not exists phone_greeting text;
