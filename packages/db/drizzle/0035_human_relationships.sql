CREATE TABLE `human_relationship_labels_config` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `created_at` text NOT NULL
);

CREATE UNIQUE INDEX `human_relationship_labels_config_name_unique` ON `human_relationship_labels_config` (`name`);

CREATE TABLE `human_relationships` (
  `id` text PRIMARY KEY NOT NULL,
  `display_id` text NOT NULL,
  `human_id_1` text NOT NULL REFERENCES `humans`(`id`),
  `human_id_2` text NOT NULL REFERENCES `humans`(`id`),
  `label_id` text REFERENCES `human_relationship_labels_config`(`id`),
  `created_at` text NOT NULL
);

CREATE UNIQUE INDEX `human_relationships_display_id_unique` ON `human_relationships` (`display_id`);
