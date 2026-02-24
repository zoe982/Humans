-- Add sender_name column to activities
ALTER TABLE activities ADD COLUMN sender_name TEXT;

-- Backfill sender_name from notes for existing activities
-- Notes format: "Inbound from {name}\n..." or "Outbound from {name}\n..."
UPDATE activities
SET sender_name = CASE
  WHEN notes LIKE 'Inbound from %' THEN
    CASE
      WHEN INSTR(SUBSTR(notes, 15), CHAR(10)) > 0
        THEN SUBSTR(notes, 15, INSTR(SUBSTR(notes, 15), CHAR(10)) - 1)
      ELSE SUBSTR(notes, 15)
    END
  WHEN notes LIKE 'Outbound from %' THEN
    CASE
      WHEN INSTR(SUBSTR(notes, 16), CHAR(10)) > 0
        THEN SUBSTR(notes, 16, INSTR(SUBSTR(notes, 16), CHAR(10)) - 1)
      ELSE SUBSTR(notes, 16)
    END
  ELSE NULL
END
WHERE notes IS NOT NULL
  AND (notes LIKE 'Inbound from %' OR notes LIKE 'Outbound from %');

-- Clear "Unknown" values so display-time fallbacks can kick in
UPDATE activities SET sender_name = NULL WHERE sender_name = 'Unknown';
