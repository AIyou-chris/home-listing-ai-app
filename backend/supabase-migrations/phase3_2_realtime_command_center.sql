-- Phase 3.2: Realtime command center action logging

BEGIN;

CREATE TABLE IF NOT EXISTS public.agent_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  lead_id uuid NOT NULL,
  action text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_actions_action_check CHECK (
    action IN (
      'call_clicked',
      'email_clicked',
      'status_changed',
      'appointment_created',
      'appointment_updated'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_agent_actions_agent_created
  ON public.agent_actions (agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_actions_lead_created
  ON public.agent_actions (lead_id, created_at DESC);

COMMIT;
