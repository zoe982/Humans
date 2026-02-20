ALTER TABLE error_log ADD COLUMN display_id text NOT NULL DEFAULT '';
ALTER TABLE error_log ADD COLUMN resolution_status text NOT NULL DEFAULT 'open';
-- Backfill existing rows with sequential ERR-alpha-NNN display IDs
UPDATE error_log SET display_id = 'ERR-alpha-' || SUBSTR('000' || CAST(ROWID AS TEXT), -3, 3) WHERE display_id = '';
CREATE UNIQUE INDEX error_log_display_id_idx ON error_log(display_id);
CREATE INDEX error_log_resolution_status_idx ON error_log(resolution_status);
-- Seed ERR counter in display_id_counters
INSERT OR REPLACE INTO display_id_counters (prefix, counter) SELECT 'ERR', COUNT(*) FROM error_log;
