CREATE TABLE websites (
  id TEXT PRIMARY KEY,
  display_id TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  human_id TEXT REFERENCES humans(id),
  account_id TEXT REFERENCES accounts(id),
  created_at TEXT NOT NULL
);
CREATE INDEX websites_human_id_idx ON websites(human_id);
CREATE INDEX websites_account_id_idx ON websites(account_id);
INSERT INTO display_id_counters (prefix, current_counter) VALUES ('WEB', 0);
