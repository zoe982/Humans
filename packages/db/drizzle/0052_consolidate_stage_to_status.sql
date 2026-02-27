-- Consolidate stage into status: copy stage values then drop the column
UPDATE general_leads SET status = stage;
ALTER TABLE general_leads DROP COLUMN stage;
