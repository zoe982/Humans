CREATE TABLE `social_id_platforms_config` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `created_at` text NOT NULL
);

CREATE TABLE `social_ids` (
  `id` text PRIMARY KEY NOT NULL,
  `display_id` text NOT NULL,
  `handle` text NOT NULL,
  `platform_id` text REFERENCES `social_id_platforms_config`(`id`),
  `human_id` text,
  `account_id` text,
  `created_at` text NOT NULL
);

CREATE UNIQUE INDEX `social_ids_display_id_unique` ON `social_ids` (`display_id`);
CREATE INDEX `social_ids_human_id_idx` ON `social_ids` (`human_id`);
CREATE INDEX `social_ids_account_id_idx` ON `social_ids` (`account_id`);

-- Seed default platforms
INSERT INTO `social_id_platforms_config` (`id`, `name`, `created_at`)
VALUES ('instagram', 'Instagram', datetime('now'));
INSERT INTO `social_id_platforms_config` (`id`, `name`, `created_at`)
VALUES ('facebook', 'Facebook', datetime('now'));

-- Initialize SOC display ID counter
INSERT INTO `display_id_counters` (`prefix`, `counter`) VALUES ('SOC', 0);
