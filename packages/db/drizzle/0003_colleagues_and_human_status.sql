-- Create colleagues table (replaces users)
CREATE TABLE colleagues (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  middle_names TEXT,
  last_name TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  google_id TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'viewer',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Copy data from users, splitting name into first_name/last_name
INSERT INTO colleagues (id, email, first_name, middle_names, last_name, name, avatar_url, google_id, role, is_active, created_at, updated_at)
SELECT
  id,
  email,
  CASE
    WHEN INSTR(name, ' ') > 0 THEN SUBSTR(name, 1, INSTR(name, ' ') - 1)
    ELSE name
  END,
  NULL,
  CASE
    WHEN INSTR(name, ' ') > 0 THEN SUBSTR(name, INSTR(name, ' ') + 1)
    ELSE ''
  END,
  name,
  avatar_url,
  google_id,
  role,
  is_active,
  created_at,
  updated_at
FROM users;

-- Create indexes
CREATE UNIQUE INDEX colleagues_email_unique ON colleagues(email);
CREATE UNIQUE INDEX colleagues_google_id_unique ON colleagues(google_id);

-- Update foreign keys: activities, audit_log, clients, lead_events all reference users(id)
-- SQLite doesn't enforce FK by default and column names stay the same, so no ALTER needed

-- Drop old users table
DROP TABLE users;

-- Add status column to humans
ALTER TABLE humans ADD COLUMN status TEXT NOT NULL DEFAULT 'open';
