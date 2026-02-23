ALTER TABLE general_leads ADD COLUMN email TEXT;
ALTER TABLE general_leads ADD COLUMN phone TEXT;
ALTER TABLE activities ADD COLUMN front_contact_handle TEXT;
ALTER TABLE front_sync_runs ADD COLUMN linked_to_general_leads INTEGER NOT NULL DEFAULT 0;
