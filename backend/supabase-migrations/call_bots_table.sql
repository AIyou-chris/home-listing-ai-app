-- Call bots library for AI voice funnels
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.call_bots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    bot_key text NOT NULL,
    name text NOT NULL,
    description text DEFAULT '',
    hume_config_id text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    is_default boolean NOT NULL DEFAULT false,
    is_system boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT call_bots_user_key_unique UNIQUE (user_id, bot_key)
);

CREATE INDEX IF NOT EXISTS idx_call_bots_user_active
    ON public.call_bots (user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_call_bots_user_default
    ON public.call_bots (user_id, is_default DESC, created_at DESC);
