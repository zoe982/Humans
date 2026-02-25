-- Agreement types config table (admin-managed dropdown)
CREATE TABLE IF NOT EXISTS `agreement_types_config` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `created_at` text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `agreement_types_config_name_unique` ON `agreement_types_config` (`name`);

-- Agreements table
CREATE TABLE IF NOT EXISTS `agreements` (
  `id` text PRIMARY KEY NOT NULL,
  `display_id` text NOT NULL,
  `title` text NOT NULL,
  `type_id` text,
  `status` text NOT NULL DEFAULT 'open',
  `activation_date` text,
  `notes` text,
  `human_id` text,
  `account_id` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `agreements_display_id_unique` ON `agreements` (`display_id`);
CREATE INDEX IF NOT EXISTS `agreements_human_id_idx` ON `agreements` (`human_id`);
CREATE INDEX IF NOT EXISTS `agreements_account_id_idx` ON `agreements` (`account_id`);

-- Documents table (generic, entity-linked)
CREATE TABLE IF NOT EXISTS `documents` (
  `id` text PRIMARY KEY NOT NULL,
  `display_id` text NOT NULL,
  `key` text NOT NULL,
  `filename` text NOT NULL,
  `content_type` text NOT NULL,
  `size_bytes` integer NOT NULL,
  `entity_type` text NOT NULL,
  `entity_id` text NOT NULL,
  `uploaded_by` text,
  `created_at` text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `documents_display_id_unique` ON `documents` (`display_id`);
CREATE INDEX IF NOT EXISTS `documents_entity_idx` ON `documents` (`entity_type`, `entity_id`);
CREATE INDEX IF NOT EXISTS `documents_key_idx` ON `documents` (`key`);

-- Display ID counter seeds
INSERT INTO `display_id_counters` (`prefix`, `counter`) VALUES ('AGR', 0);
INSERT INTO `display_id_counters` (`prefix`, `counter`) VALUES ('DOC', 0);
