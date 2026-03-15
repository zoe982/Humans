-- Schema migrations tracking table
-- Records which migrations have been applied to production D1.
-- deploy.sh checks this table and blocks deployment if migrations are pending.

CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Backfill all previously applied migrations
INSERT OR IGNORE INTO schema_migrations (filename) VALUES
  ('0000_opposite_bloodaxe.sql'),
  ('0001_add_missing_indexes.sql'),
  ('0001_misty_master_mold.sql'),
  ('0002_add_evacuation_leads.sql'),
  ('0003_rename_opp_stages_remove_qualified.sql'),
  ('0004_configurable_human_types.sql'),
  ('0005_add_schema_migrations_tracking.sql');
