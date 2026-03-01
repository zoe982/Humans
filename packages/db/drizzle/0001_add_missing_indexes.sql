-- Migration: Add missing indexes on high-traffic tables
-- activities has zero indexes on FK or date columns despite being the most queried table
-- opportunities has no index on stage, ownerId, or nextActionDueDate
-- humans has no index on createdAt (used for ORDER BY in listHumans)

-- activities indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS activities_human_id_idx ON activities (human_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS activities_account_id_idx ON activities (account_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS activities_activity_date_idx ON activities (activity_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS activities_general_lead_id_idx ON activities (general_lead_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS activities_opportunity_id_idx ON activities (opportunity_id);

-- opportunities indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS opportunities_stage_idx ON opportunities (stage);
CREATE INDEX CONCURRENTLY IF NOT EXISTS opportunities_owner_id_idx ON opportunities (owner_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS opportunities_next_action_due_date_idx ON opportunities (next_action_due_date);

-- humans indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS humans_created_at_idx ON humans (created_at);
