-- Add duration column to coupons table
ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS duration TEXT DEFAULT 'once' CHECK (duration IN ('once', 'repeating', 'forever'));
