-- Rename opportunity stages
UPDATE opportunities SET stage = 'deposit_requested' WHERE stage = 'deposit_request_sent';
UPDATE opportunities SET stage = 'flight_confirmed' WHERE stage = 'confirmed_to_operate';

-- Update cadence config rows referencing old stage names
UPDATE opportunity_stage_cadence_config SET stage = 'deposit_requested' WHERE stage = 'deposit_request_sent';
UPDATE opportunity_stage_cadence_config SET stage = 'flight_confirmed' WHERE stage = 'confirmed_to_operate';

-- Migrate general leads with qualified status to pending_response
UPDATE general_leads SET status = 'pending_response' WHERE status = 'qualified';
