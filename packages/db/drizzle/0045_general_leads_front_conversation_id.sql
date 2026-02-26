-- Add front_conversation_id to general_leads for traceability and duplicate detection
ALTER TABLE general_leads ADD COLUMN front_conversation_id TEXT;

CREATE UNIQUE INDEX general_leads_front_conversation_id_unique
  ON general_leads(front_conversation_id) WHERE front_conversation_id IS NOT NULL;
