ALTER TABLE public.ai_kb ADD COLUMN IF NOT EXISTS property_id TEXT;
CREATE INDEX IF NOT EXISTS idx_ai_kb_property_id ON public.ai_kb(property_id);
