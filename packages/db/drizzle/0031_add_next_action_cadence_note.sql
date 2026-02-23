ALTER TABLE opportunities ADD COLUMN next_action_cadence_note TEXT;
-- Trim existing due dates to date-only
UPDATE opportunities SET next_action_due_date = SUBSTR(next_action_due_date, 1, 10)
WHERE next_action_due_date IS NOT NULL AND LENGTH(next_action_due_date) > 10;
