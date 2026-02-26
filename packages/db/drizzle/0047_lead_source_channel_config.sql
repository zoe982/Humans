-- Add source/channel columns to general_leads
ALTER TABLE general_leads ADD COLUMN source TEXT;
ALTER TABLE general_leads ADD COLUMN channel TEXT;

-- Lead sources config table
CREATE TABLE lead_sources_config (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

-- Lead channels config table
CREATE TABLE lead_channels_config (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);
