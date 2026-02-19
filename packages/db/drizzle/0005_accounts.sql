-- Accounts feature migration
-- Creates all account-related tables, alters activities, and seeds config data

-- Core accounts table
CREATE TABLE IF NOT EXISTS `accounts` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `status` text NOT NULL DEFAULT 'open',
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);

-- Account types config (admin lookup)
CREATE TABLE IF NOT EXISTS `account_types_config` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `created_at` text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `account_types_config_name_unique` ON `account_types_config` (`name`);

-- Account types junction
CREATE TABLE IF NOT EXISTS `account_types` (
  `id` text PRIMARY KEY NOT NULL,
  `account_id` text NOT NULL REFERENCES `accounts`(`id`),
  `type_id` text NOT NULL REFERENCES `account_types_config`(`id`),
  `created_at` text NOT NULL
);

-- Account-human labels config (admin lookup)
CREATE TABLE IF NOT EXISTS `account_human_labels_config` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `created_at` text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `account_human_labels_config_name_unique` ON `account_human_labels_config` (`name`);

-- Account-humans junction (many-to-many)
CREATE TABLE IF NOT EXISTS `account_humans` (
  `id` text PRIMARY KEY NOT NULL,
  `account_id` text NOT NULL REFERENCES `accounts`(`id`),
  `human_id` text NOT NULL REFERENCES `humans`(`id`),
  `label_id` text REFERENCES `account_human_labels_config`(`id`),
  `created_at` text NOT NULL
);

-- Account email labels config (admin lookup)
CREATE TABLE IF NOT EXISTS `account_email_labels_config` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `created_at` text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `account_email_labels_config_name_unique` ON `account_email_labels_config` (`name`);

-- Account emails
CREATE TABLE IF NOT EXISTS `account_emails` (
  `id` text PRIMARY KEY NOT NULL,
  `account_id` text NOT NULL REFERENCES `accounts`(`id`),
  `email` text NOT NULL,
  `label_id` text REFERENCES `account_email_labels_config`(`id`),
  `is_primary` integer NOT NULL DEFAULT 0,
  `created_at` text NOT NULL
);

-- Account phone labels config (admin lookup)
CREATE TABLE IF NOT EXISTS `account_phone_labels_config` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `created_at` text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `account_phone_labels_config_name_unique` ON `account_phone_labels_config` (`name`);

-- Account phone numbers
CREATE TABLE IF NOT EXISTS `account_phone_numbers` (
  `id` text PRIMARY KEY NOT NULL,
  `account_id` text NOT NULL REFERENCES `accounts`(`id`),
  `phone_number` text NOT NULL,
  `label_id` text REFERENCES `account_phone_labels_config`(`id`),
  `has_whatsapp` integer NOT NULL DEFAULT 0,
  `is_primary` integer NOT NULL DEFAULT 0,
  `created_at` text NOT NULL
);

-- Add account_id to activities
ALTER TABLE `activities` ADD COLUMN `account_id` text REFERENCES `accounts`(`id`);

-- Seed: Account types
INSERT INTO `account_types_config` (`id`, `name`, `created_at`) VALUES
  ('atc_flight_broker', 'Flight Broker', '2026-02-19T00:00:00.000Z'),
  ('atc_flight_provider', 'Flight Provider', '2026-02-19T00:00:00.000Z'),
  ('atc_dog_services', 'Dog Services', '2026-02-19T00:00:00.000Z'),
  ('atc_business_provider', 'Business Provider', '2026-02-19T00:00:00.000Z');

-- Seed: Human-account role labels
INSERT INTO `account_human_labels_config` (`id`, `name`, `created_at`) VALUES
  ('ahl_director', 'Director', '2026-02-19T00:00:00.000Z'),
  ('ahl_broker', 'Broker', '2026-02-19T00:00:00.000Z');

-- Seed: Account email labels
INSERT INTO `account_email_labels_config` (`id`, `name`, `created_at`) VALUES
  ('ael_main', 'Main', '2026-02-19T00:00:00.000Z'),
  ('ael_support', 'Support', '2026-02-19T00:00:00.000Z'),
  ('ael_billing', 'Billing', '2026-02-19T00:00:00.000Z');

-- Seed: Account phone labels
INSERT INTO `account_phone_labels_config` (`id`, `name`, `created_at`) VALUES
  ('apl_main', 'Main', '2026-02-19T00:00:00.000Z'),
  ('apl_support', 'Support', '2026-02-19T00:00:00.000Z'),
  ('apl_fax', 'Fax', '2026-02-19T00:00:00.000Z');
