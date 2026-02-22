ALTER TABLE opportunities ADD COLUMN flight_id text;
INSERT INTO display_id_counters (prefix, counter) VALUES ('FLY', 0);
