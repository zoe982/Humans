-- Make pets.name nullable (SQLite requires table recreation)
PRAGMA foreign_keys = OFF;

CREATE TABLE pets_new (
  id text PRIMARY KEY NOT NULL,
  display_id text NOT NULL UNIQUE,
  human_id text REFERENCES humans(id),
  name text,
  breed text,
  weight real,
  is_active integer NOT NULL DEFAULT 1,
  created_at text NOT NULL,
  updated_at text NOT NULL,
  type text NOT NULL DEFAULT 'dog',
  notes text
);

INSERT INTO pets_new (id, display_id, human_id, name, breed, weight, is_active, created_at, updated_at, type, notes)
  SELECT id, display_id, human_id, name, breed, weight, is_active, created_at, updated_at, type, notes FROM pets;

DROP TABLE pets;

ALTER TABLE pets_new RENAME TO pets;

CREATE UNIQUE INDEX IF NOT EXISTS pets_display_id_unique ON pets(display_id);

PRAGMA foreign_keys = ON;
