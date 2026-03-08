ALTER TABLE activities ADD COLUMN evacuation_lead_id text;
CREATE INDEX activities_evacuation_lead_id_idx ON activities(evacuation_lead_id);
ALTER TABLE lead_scores ADD COLUMN evacuation_lead_id text;
CREATE INDEX lead_scores_evacuation_lead_id_idx ON lead_scores(evacuation_lead_id);
ALTER TABLE emails ADD COLUMN evacuation_lead_id text;
CREATE INDEX emails_evacuation_lead_id_idx ON emails(evacuation_lead_id);
ALTER TABLE phones ADD COLUMN evacuation_lead_id text;
CREATE INDEX phones_evacuation_lead_id_idx ON phones(evacuation_lead_id);
ALTER TABLE social_ids ADD COLUMN evacuation_lead_id text;
CREATE INDEX social_ids_evacuation_lead_id_idx ON social_ids(evacuation_lead_id);
CREATE TABLE human_evacuation_leads (
  id text PRIMARY KEY,
  human_id text NOT NULL REFERENCES humans(id),
  evacuation_lead_id text NOT NULL,
  linked_at text NOT NULL
);
CREATE UNIQUE INDEX human_evacuation_leads_evacuation_lead_id_unique ON human_evacuation_leads(evacuation_lead_id);
