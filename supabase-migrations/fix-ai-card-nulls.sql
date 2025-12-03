-- Make AI Card columns nullable to prevent insert errors
ALTER TABLE public.ai_card_profiles
ALTER COLUMN professional_title DROP NOT NULL,
ALTER COLUMN company DROP NOT NULL,
ALTER COLUMN phone DROP NOT NULL,
ALTER COLUMN email DROP NOT NULL,
ALTER COLUMN website DROP NOT NULL,
ALTER COLUMN bio DROP NOT NULL,
ALTER COLUMN brand_color DROP NOT NULL;
