ALTER TABLE opportunities ADD COLUMN owner_id text REFERENCES colleagues(id);
