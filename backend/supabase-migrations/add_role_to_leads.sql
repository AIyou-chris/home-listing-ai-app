DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'role') THEN
        ALTER TABLE leads ADD COLUMN role VARCHAR(20) DEFAULT 'lead';
    END IF;
END $$;
