ALTER TABLE activities ADD COLUMN direction TEXT;
UPDATE activities SET direction = 'inbound' WHERE notes LIKE 'Inbound from %';
UPDATE activities SET direction = 'outbound' WHERE notes LIKE 'Outbound from %';
