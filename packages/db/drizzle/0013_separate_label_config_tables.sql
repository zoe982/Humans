-- Create separate label config tables for account and human email/phone labels
CREATE TABLE IF NOT EXISTS `account_email_labels_config` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `created_at` text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `account_email_labels_config_name_unique` ON `account_email_labels_config` (`name`);

CREATE TABLE IF NOT EXISTS `account_phone_labels_config` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `created_at` text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `account_phone_labels_config_name_unique` ON `account_phone_labels_config` (`name`);

CREATE TABLE IF NOT EXISTS `human_email_labels_config` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `created_at` text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `human_email_labels_config_name_unique` ON `human_email_labels_config` (`name`);

CREATE TABLE IF NOT EXISTS `human_phone_labels_config` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `created_at` text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `human_phone_labels_config_name_unique` ON `human_phone_labels_config` (`name`);

-- Copy existing labels from unified tables to both account and human tables
INSERT OR IGNORE INTO `account_email_labels_config` (`id`, `name`, `created_at`)
  SELECT `id`, `name`, `created_at` FROM `email_labels_config`;

INSERT OR IGNORE INTO `human_email_labels_config` (`id`, `name`, `created_at`)
  SELECT `id`, `name`, `created_at` FROM `email_labels_config`;

INSERT OR IGNORE INTO `account_phone_labels_config` (`id`, `name`, `created_at`)
  SELECT `id`, `name`, `created_at` FROM `phone_labels_config`;

INSERT OR IGNORE INTO `human_phone_labels_config` (`id`, `name`, `created_at`)
  SELECT `id`, `name`, `created_at` FROM `phone_labels_config`;
