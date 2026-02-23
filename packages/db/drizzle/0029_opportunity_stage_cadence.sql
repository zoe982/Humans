CREATE TABLE opportunity_stage_cadence_config (
  id TEXT PRIMARY KEY,
  stage TEXT NOT NULL UNIQUE,
  cadence_hours INTEGER NOT NULL,
  display_text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Seed with current hardcoded values
INSERT INTO opportunity_stage_cadence_config (id, stage, cadence_hours, display_text, created_at, updated_at) VALUES
  ('osc_open', 'open', 24, 'Follow up within 24 hours', '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
  ('osc_qualified', 'qualified', 24, 'Follow up within 24 hours', '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
  ('osc_deposit_request_sent', 'deposit_request_sent', 48, 'Follow up within 48 hours', '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
  ('osc_deposit_received', 'deposit_received', 168, 'Follow up within 7 days', '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
  ('osc_group_forming', 'group_forming', 168, 'Follow up within 7 days', '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
  ('osc_confirmed_to_operate', 'confirmed_to_operate', 48, 'Follow up within 48 hours', '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
  ('osc_paid', 'paid', 96, 'Follow up within 3-5 days', '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
  ('osc_docs_in_progress', 'docs_in_progress', 96, 'Follow up within 3-5 days', '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
  ('osc_docs_complete', 'docs_complete', 120, 'Follow up within 5 days', '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z');
