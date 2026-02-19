-- Pets: add human_id column
ALTER TABLE pets ADD COLUMN human_id TEXT REFERENCES humans(id);

-- Activities: add notes (replacing body), gmail_id, front_id
ALTER TABLE activities ADD COLUMN notes TEXT;
UPDATE activities SET notes = body WHERE body IS NOT NULL;
ALTER TABLE activities ADD COLUMN gmail_id TEXT;
ALTER TABLE activities ADD COLUMN front_id TEXT;
-- Normalize existing type values
UPDATE activities SET type = 'email' WHERE type NOT IN ('email','whatsapp_message','online_meeting','phone_call');

-- Phone numbers table
CREATE TABLE human_phone_numbers (
  id TEXT PRIMARY KEY NOT NULL,
  human_id TEXT NOT NULL REFERENCES humans(id),
  phone_number TEXT NOT NULL,
  label TEXT DEFAULT 'mobile' NOT NULL,
  has_whatsapp INTEGER DEFAULT 0 NOT NULL,
  is_primary INTEGER DEFAULT 0 NOT NULL,
  created_at TEXT NOT NULL
);

-- Flight bookings: add human_id to decouple from clients
ALTER TABLE flight_bookings ADD COLUMN human_id TEXT REFERENCES humans(id);
