-- Add compliance_rules column to lo_chatbot_configs
-- Stores extracted text from LO's company compliance doc upload
-- Kept separate from knowledge_base so AI treats it as hard constraints, not reference material
ALTER TABLE lo_chatbot_configs
ADD COLUMN IF NOT EXISTS compliance_rules TEXT DEFAULT '';
