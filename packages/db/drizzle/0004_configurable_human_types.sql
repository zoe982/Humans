-- Create human_types_config table
CREATE TABLE IF NOT EXISTS human_types_config (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

-- Seed default types with deterministic IDs
INSERT INTO human_types_config (id, name, created_at) VALUES
  ('ht_client', 'Client', '2024-01-01T00:00:00.000Z'),
  ('ht_trainer', 'Trainer', '2024-01-01T00:00:00.000Z'),
  ('ht_travel_agent', 'Travel Agent', '2024-01-01T00:00:00.000Z'),
  ('ht_flight_broker', 'Flight Broker', '2024-01-01T00:00:00.000Z');

-- Migrate human_types: type (string enum) -> type_id (FK to config)
CREATE TABLE human_types_new (
  id TEXT PRIMARY KEY,
  human_id TEXT NOT NULL REFERENCES humans(id),
  type_id TEXT NOT NULL REFERENCES human_types_config(id),
  created_at TEXT NOT NULL
);

INSERT INTO human_types_new (id, human_id, type_id, created_at)
SELECT ht.id, ht.human_id, htc.id, ht.created_at
FROM human_types ht
INNER JOIN human_types_config htc ON (
  CASE ht.type
    WHEN 'client' THEN 'ht_client'
    WHEN 'trainer' THEN 'ht_trainer'
    WHEN 'travel_agent' THEN 'ht_travel_agent'
    WHEN 'flight_broker' THEN 'ht_flight_broker'
  END = htc.id
);

DROP TABLE human_types;
ALTER TABLE human_types_new RENAME TO human_types;
