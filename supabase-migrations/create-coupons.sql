-- Create coupons table for billing discounts
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  amount NUMERIC NOT NULL,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Policies for Admins (Assuming 'admin' role or is_user_admin function)
-- View coupons
CREATE POLICY "Admins can view coupons" ON public.coupons
  FOR SELECT USING (
    auth.role() = 'service_role' OR
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') IS NOT NULL
  );

-- Insert/Update/Delete coupons
CREATE POLICY "Admins can manage coupons" ON public.coupons
  FOR ALL USING (
    auth.role() = 'service_role' OR
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') IS NOT NULL
  );
