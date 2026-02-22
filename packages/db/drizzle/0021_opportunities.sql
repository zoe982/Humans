-- Migration 0021: Opportunities feature
-- 1. Create opportunity_human_roles_config table
-- 2. Create opportunities table
-- 3. Create opportunity_humans join table
-- 4. Create opportunity_pets join table
-- 5. Add opportunity_id to activities
-- 6. Seed display_id_counters and default roles

-- ============================================================
-- STEP 1: Config table for human roles in opportunities
-- ============================================================

CREATE TABLE `opportunity_human_roles_config` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL UNIQUE,
  `created_at` text NOT NULL
);

-- ============================================================
-- STEP 2: Main opportunities table
-- ============================================================

CREATE TABLE `opportunities` (
  `id` text PRIMARY KEY NOT NULL,
  `display_id` text NOT NULL UNIQUE,
  `stage` text NOT NULL DEFAULT 'open',
  `seats_requested` integer NOT NULL DEFAULT 1,
  `loss_reason` text,
  `next_action_owner_id` text REFERENCES `colleagues`(`id`),
  `next_action_description` text,
  `next_action_type` text,
  `next_action_due_date` text,
  `next_action_completed_at` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);

-- ============================================================
-- STEP 3: Opportunity-humans join table
-- ============================================================

CREATE TABLE `opportunity_humans` (
  `id` text PRIMARY KEY NOT NULL,
  `opportunity_id` text NOT NULL REFERENCES `opportunities`(`id`),
  `human_id` text NOT NULL REFERENCES `humans`(`id`),
  `role_id` text REFERENCES `opportunity_human_roles_config`(`id`),
  `created_at` text NOT NULL
);

CREATE INDEX `opportunity_humans_opportunity_id_idx` ON `opportunity_humans`(`opportunity_id`);
CREATE INDEX `opportunity_humans_human_id_idx` ON `opportunity_humans`(`human_id`);

-- ============================================================
-- STEP 4: Opportunity-pets join table
-- ============================================================

CREATE TABLE `opportunity_pets` (
  `id` text PRIMARY KEY NOT NULL,
  `opportunity_id` text NOT NULL REFERENCES `opportunities`(`id`),
  `pet_id` text NOT NULL REFERENCES `pets`(`id`),
  `created_at` text NOT NULL
);

CREATE INDEX `opportunity_pets_opportunity_id_idx` ON `opportunity_pets`(`opportunity_id`);
CREATE INDEX `opportunity_pets_pet_id_idx` ON `opportunity_pets`(`pet_id`);

-- ============================================================
-- STEP 5: Add opportunity_id to activities
-- ============================================================

ALTER TABLE `activities` ADD COLUMN `opportunity_id` text REFERENCES `opportunities`(`id`);

-- ============================================================
-- STEP 6: Seed data
-- ============================================================

-- Display ID counter for OPP prefix
INSERT INTO display_id_counters (prefix, counter) VALUES ('OPP', 0);

-- Default roles
INSERT INTO opportunity_human_roles_config (id, name, created_at) VALUES
  ('ohr_primary', 'primary', datetime('now')),
  ('ohr_passenger', 'passenger', datetime('now'));
