-- Allow payment_status='comp' (admin-set, full LO Pro, no Stripe). Applied 2026-09-28.
ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_payment_status_check;
ALTER TABLE agents ADD CONSTRAINT agents_payment_status_check CHECK (payment_status = ANY (ARRAY['awaiting_payment','trial','active','expired','cancelled','comp']));
