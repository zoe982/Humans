-- Create config tables
CREATE TABLE human_email_labels_config (id text PRIMARY KEY NOT NULL, name text NOT NULL, created_at text NOT NULL);
CREATE UNIQUE INDEX human_email_labels_config_name_unique ON human_email_labels_config (name);
CREATE TABLE human_phone_labels_config (id text PRIMARY KEY NOT NULL, name text NOT NULL, created_at text NOT NULL);
CREATE UNIQUE INDEX human_phone_labels_config_name_unique ON human_phone_labels_config (name);

-- Seed from existing enum values
INSERT INTO human_email_labels_config (id, name, created_at) VALUES
  ('hel_work', 'Work', '2026-02-19T00:00:00.000Z'),
  ('hel_personal', 'Personal', '2026-02-19T00:00:00.000Z'),
  ('hel_other', 'Other', '2026-02-19T00:00:00.000Z');
INSERT INTO human_phone_labels_config (id, name, created_at) VALUES
  ('hpl_mobile', 'Mobile', '2026-02-19T00:00:00.000Z'),
  ('hpl_home', 'Home', '2026-02-19T00:00:00.000Z'),
  ('hpl_work', 'Work', '2026-02-19T00:00:00.000Z'),
  ('hpl_other', 'Other', '2026-02-19T00:00:00.000Z');

-- Add label_id columns, migrate data, drop old columns
ALTER TABLE human_emails ADD COLUMN label_id text REFERENCES human_email_labels_config(id);
UPDATE human_emails SET label_id = 'hel_work' WHERE label = 'work';
UPDATE human_emails SET label_id = 'hel_personal' WHERE label = 'personal';
UPDATE human_emails SET label_id = 'hel_other' WHERE label = 'other';
ALTER TABLE human_emails DROP COLUMN label;

ALTER TABLE human_phone_numbers ADD COLUMN label_id text REFERENCES human_phone_labels_config(id);
UPDATE human_phone_numbers SET label_id = 'hpl_mobile' WHERE label = 'mobile';
UPDATE human_phone_numbers SET label_id = 'hpl_home' WHERE label = 'home';
UPDATE human_phone_numbers SET label_id = 'hpl_work' WHERE label = 'work';
UPDATE human_phone_numbers SET label_id = 'hpl_other' WHERE label = 'other';
ALTER TABLE human_phone_numbers DROP COLUMN label;
