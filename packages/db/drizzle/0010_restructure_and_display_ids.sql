-- Migration 0010: Restructure tables + Add display IDs
-- 1. Merge email/phone tables into universal emails/phones
-- 2. Remove unused tables (clients, flights, flight_bookings)
-- 3. Fix pets (drop clientId) and lead_events (clientId -> humanId)
-- 4. Add display_id to all entity tables
-- 5. Create display_id_counters table
-- 6. Backfill existing records with sequential display IDs

-- ============================================================
-- STEP 1: Create new merged tables
-- ============================================================

-- Unified email labels config
CREATE TABLE IF NOT EXISTS email_labels_config (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

-- Unified phone labels config
CREATE TABLE IF NOT EXISTS phone_labels_config (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

-- Unified emails table
CREATE TABLE IF NOT EXISTS emails (
  id TEXT PRIMARY KEY,
  display_id TEXT NOT NULL UNIQUE,
  owner_type TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  email TEXT NOT NULL,
  label_id TEXT REFERENCES email_labels_config(id),
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS emails_owner_type_owner_id_idx ON emails(owner_type, owner_id);

-- Unified phones table
CREATE TABLE IF NOT EXISTS phones (
  id TEXT PRIMARY KEY,
  display_id TEXT NOT NULL UNIQUE,
  owner_type TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  label_id TEXT REFERENCES phone_labels_config(id),
  has_whatsapp INTEGER NOT NULL DEFAULT 0,
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS phones_owner_type_owner_id_idx ON phones(owner_type, owner_id);

-- Display ID counters
CREATE TABLE IF NOT EXISTS display_id_counters (
  prefix TEXT PRIMARY KEY,
  counter INTEGER NOT NULL DEFAULT 0
);

-- Seed counter prefixes
INSERT INTO display_id_counters (prefix, counter) VALUES
  ('HUM', 0), ('ACC', 0), ('ACT', 0), ('COL', 0),
  ('LES', 0), ('LED', 0), ('GEO', 0), ('PET', 0),
  ('EML', 0), ('FON', 0), ('GEX', 0), ('LEA', 0);

-- ============================================================
-- STEP 2: Migrate email label configs (merge, deduplicate)
-- ============================================================

INSERT OR IGNORE INTO email_labels_config (id, name, created_at)
  SELECT id, name, created_at FROM human_email_labels_config;

INSERT OR IGNORE INTO email_labels_config (id, name, created_at)
  SELECT id, name, created_at FROM account_email_labels_config
  WHERE name NOT IN (SELECT name FROM email_labels_config);

INSERT OR IGNORE INTO phone_labels_config (id, name, created_at)
  SELECT id, name, created_at FROM human_phone_labels_config;

INSERT OR IGNORE INTO phone_labels_config (id, name, created_at)
  SELECT id, name, created_at FROM account_phone_labels_config
  WHERE name NOT IN (SELECT name FROM phone_labels_config);

-- ============================================================
-- STEP 3: Migrate email data
-- ============================================================

-- Human emails -> emails with ownerType='human'
INSERT INTO emails (id, display_id, owner_type, owner_id, email, label_id, is_primary, created_at)
  SELECT id, 'EML-alpha-' || printf('%03d', ROW_NUMBER() OVER (ORDER BY ROWID)),
    'human', human_id, email, label_id, is_primary, created_at
  FROM human_emails;

-- Account emails -> emails with ownerType='account'
INSERT INTO emails (id, display_id, owner_type, owner_id, email, label_id, is_primary, created_at)
  SELECT id,
    'EML-alpha-' || printf('%03d', (SELECT COUNT(*) FROM human_emails) + ROW_NUMBER() OVER (ORDER BY ROWID)),
    'account', account_id, email,
    CASE WHEN label_id IN (SELECT id FROM email_labels_config) THEN label_id ELSE NULL END,
    is_primary, created_at
  FROM account_emails;

-- Update EML counter
UPDATE display_id_counters SET counter = (SELECT COUNT(*) FROM emails) WHERE prefix = 'EML';

-- ============================================================
-- STEP 4: Migrate phone data
-- ============================================================

-- Human phones -> phones with ownerType='human'
INSERT INTO phones (id, display_id, owner_type, owner_id, phone_number, label_id, has_whatsapp, is_primary, created_at)
  SELECT id, 'FON-alpha-' || printf('%03d', ROW_NUMBER() OVER (ORDER BY ROWID)),
    'human', human_id, phone_number, label_id, has_whatsapp, is_primary, created_at
  FROM human_phone_numbers;

-- Account phones -> phones with ownerType='account'
INSERT INTO phones (id, display_id, owner_type, owner_id, phone_number, label_id, has_whatsapp, is_primary, created_at)
  SELECT id,
    'FON-alpha-' || printf('%03d', (SELECT COUNT(*) FROM human_phone_numbers) + ROW_NUMBER() OVER (ORDER BY ROWID)),
    'account', account_id, phone_number,
    CASE WHEN label_id IN (SELECT id FROM phone_labels_config) THEN label_id ELSE NULL END,
    has_whatsapp, is_primary, created_at
  FROM account_phone_numbers;

-- Update FON counter
UPDATE display_id_counters SET counter = (SELECT COUNT(*) FROM phones) WHERE prefix = 'FON';

-- ============================================================
-- STEP 5: Add display_id columns to existing entity tables
-- ============================================================

ALTER TABLE humans ADD COLUMN display_id TEXT;
ALTER TABLE accounts ADD COLUMN display_id TEXT;
ALTER TABLE activities ADD COLUMN display_id TEXT;
ALTER TABLE colleagues ADD COLUMN display_id TEXT;
ALTER TABLE lead_sources ADD COLUMN display_id TEXT;
ALTER TABLE lead_events ADD COLUMN display_id TEXT;
ALTER TABLE geo_interests ADD COLUMN display_id TEXT;
ALTER TABLE pets ADD COLUMN display_id TEXT;
ALTER TABLE geo_interest_expressions ADD COLUMN display_id TEXT;

-- ============================================================
-- STEP 6: Backfill display IDs on existing rows
-- ============================================================

-- Humans
UPDATE humans SET display_id = 'HUM-alpha-' || printf('%03d', (
  SELECT COUNT(*) FROM humans h2 WHERE h2.ROWID <= humans.ROWID
));
UPDATE display_id_counters SET counter = (SELECT COUNT(*) FROM humans) WHERE prefix = 'HUM';

-- Accounts
UPDATE accounts SET display_id = 'ACC-alpha-' || printf('%03d', (
  SELECT COUNT(*) FROM accounts a2 WHERE a2.ROWID <= accounts.ROWID
));
UPDATE display_id_counters SET counter = (SELECT COUNT(*) FROM accounts) WHERE prefix = 'ACC';

-- Activities
UPDATE activities SET display_id = 'ACT-alpha-' || printf('%03d', (
  SELECT COUNT(*) FROM activities a2 WHERE a2.ROWID <= activities.ROWID
));
UPDATE display_id_counters SET counter = (SELECT COUNT(*) FROM activities) WHERE prefix = 'ACT';

-- Colleagues
UPDATE colleagues SET display_id = 'COL-alpha-' || printf('%03d', (
  SELECT COUNT(*) FROM colleagues c2 WHERE c2.ROWID <= colleagues.ROWID
));
UPDATE display_id_counters SET counter = (SELECT COUNT(*) FROM colleagues) WHERE prefix = 'COL';

-- Lead Sources
UPDATE lead_sources SET display_id = 'LES-alpha-' || printf('%03d', (
  SELECT COUNT(*) FROM lead_sources ls2 WHERE ls2.ROWID <= lead_sources.ROWID
));
UPDATE display_id_counters SET counter = (SELECT COUNT(*) FROM lead_sources) WHERE prefix = 'LES';

-- Lead Events
UPDATE lead_events SET display_id = 'LED-alpha-' || printf('%03d', (
  SELECT COUNT(*) FROM lead_events le2 WHERE le2.ROWID <= lead_events.ROWID
));
UPDATE display_id_counters SET counter = (SELECT COUNT(*) FROM lead_events) WHERE prefix = 'LED';

-- Geo Interests
UPDATE geo_interests SET display_id = 'GEO-alpha-' || printf('%03d', (
  SELECT COUNT(*) FROM geo_interests gi2 WHERE gi2.ROWID <= geo_interests.ROWID
));
UPDATE display_id_counters SET counter = (SELECT COUNT(*) FROM geo_interests) WHERE prefix = 'GEO';

-- Pets
UPDATE pets SET display_id = 'PET-alpha-' || printf('%03d', (
  SELECT COUNT(*) FROM pets p2 WHERE p2.ROWID <= pets.ROWID
));
UPDATE display_id_counters SET counter = (SELECT COUNT(*) FROM pets) WHERE prefix = 'PET';

-- Geo Interest Expressions
UPDATE geo_interest_expressions SET display_id = 'GEX-alpha-' || printf('%03d', (
  SELECT COUNT(*) FROM geo_interest_expressions ge2 WHERE ge2.ROWID <= geo_interest_expressions.ROWID
));
UPDATE display_id_counters SET counter = (SELECT COUNT(*) FROM geo_interest_expressions) WHERE prefix = 'GEX';

-- ============================================================
-- STEP 7: Create unique indexes on display_id (before NOT NULL)
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS humans_display_id_unique ON humans(display_id);
CREATE UNIQUE INDEX IF NOT EXISTS accounts_display_id_unique ON accounts(display_id);
CREATE UNIQUE INDEX IF NOT EXISTS activities_display_id_unique ON activities(display_id);
CREATE UNIQUE INDEX IF NOT EXISTS colleagues_display_id_unique ON colleagues(display_id);
CREATE UNIQUE INDEX IF NOT EXISTS lead_sources_display_id_unique ON lead_sources(display_id);
CREATE UNIQUE INDEX IF NOT EXISTS lead_events_display_id_unique ON lead_events(display_id);
CREATE UNIQUE INDEX IF NOT EXISTS geo_interests_display_id_unique ON geo_interests(display_id);
CREATE UNIQUE INDEX IF NOT EXISTS pets_display_id_unique ON pets(display_id);
CREATE UNIQUE INDEX IF NOT EXISTS geo_interest_expressions_display_id_unique ON geo_interest_expressions(display_id);

-- ============================================================
-- STEP 8: Fix lead_events (clientId -> humanId)
-- ============================================================

-- Rename client_id to human_id in lead_events
-- SQLite doesn't support RENAME COLUMN in older versions, so we recreate
CREATE TABLE lead_events_new (
  id TEXT PRIMARY KEY,
  display_id TEXT NOT NULL UNIQUE,
  human_id TEXT NOT NULL REFERENCES humans(id),
  event_type TEXT NOT NULL,
  notes TEXT,
  metadata TEXT,
  created_by_user_id TEXT REFERENCES colleagues(id),
  created_at TEXT NOT NULL
);

INSERT INTO lead_events_new (id, display_id, human_id, event_type, notes, metadata, created_by_user_id, created_at)
  SELECT id, display_id, client_id, event_type, notes, metadata, created_by_user_id, created_at
  FROM lead_events;

DROP TABLE lead_events;
ALTER TABLE lead_events_new RENAME TO lead_events;

-- ============================================================
-- STEP 9: Fix pets (drop clientId)
-- ============================================================

CREATE TABLE pets_new (
  id TEXT PRIMARY KEY,
  display_id TEXT NOT NULL UNIQUE,
  human_id TEXT REFERENCES humans(id),
  name TEXT NOT NULL,
  breed TEXT,
  weight REAL,
  age INTEGER,
  special_needs TEXT,
  health_cert_r2_key TEXT,
  vaccination_r2_key TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO pets_new (id, display_id, human_id, name, breed, weight, age, special_needs, health_cert_r2_key, vaccination_r2_key, is_active, created_at, updated_at)
  SELECT id, display_id, human_id, name, breed, weight, age, special_needs, health_cert_r2_key, vaccination_r2_key, is_active, created_at, updated_at
  FROM pets;

DROP TABLE pets;
ALTER TABLE pets_new RENAME TO pets;

-- ============================================================
-- STEP 10: Drop old tables
-- ============================================================

DROP TABLE IF EXISTS flight_bookings;
DROP TABLE IF EXISTS flights;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS human_emails;
DROP TABLE IF EXISTS account_emails;
DROP TABLE IF EXISTS human_phone_numbers;
DROP TABLE IF EXISTS account_phone_numbers;
DROP TABLE IF EXISTS human_email_labels_config;
DROP TABLE IF EXISTS account_email_labels_config;
DROP TABLE IF EXISTS human_phone_labels_config;
DROP TABLE IF EXISTS account_phone_labels_config;
