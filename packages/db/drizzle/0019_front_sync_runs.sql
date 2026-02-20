CREATE TABLE front_sync_runs (
  id TEXT PRIMARY KEY,
  display_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'running',
  started_at TEXT NOT NULL,
  completed_at TEXT,
  total_messages INTEGER NOT NULL DEFAULT 0,
  imported INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  unmatched INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  error_messages TEXT,
  linked_to_humans INTEGER NOT NULL DEFAULT 0,
  linked_to_accounts INTEGER NOT NULL DEFAULT 0,
  linked_to_route_signups INTEGER NOT NULL DEFAULT 0,
  linked_to_bookings INTEGER NOT NULL DEFAULT 0,
  linked_to_colleagues INTEGER NOT NULL DEFAULT 0,
  initiated_by_colleague_id TEXT REFERENCES colleagues(id),
  created_at TEXT NOT NULL
);

ALTER TABLE activities ADD COLUMN sync_run_id TEXT REFERENCES front_sync_runs(id);
ALTER TABLE activities ADD COLUMN colleague_id TEXT REFERENCES colleagues(id);

-- Migrate data from old column to new column
UPDATE activities SET colleague_id = created_by_user_id WHERE created_by_user_id IS NOT NULL;

-- Note: old created_by_user_id column left in place (SQLite cannot drop columns with FK constraints).
-- The Drizzle schema no longer references it; new code uses colleague_id.
