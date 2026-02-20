CREATE TABLE `route_interests` (
  `id` text PRIMARY KEY NOT NULL,
  `display_id` text NOT NULL,
  `origin_city` text NOT NULL,
  `origin_country` text NOT NULL,
  `destination_city` text NOT NULL,
  `destination_country` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);

CREATE UNIQUE INDEX `route_interests_display_id_unique` ON `route_interests` (`display_id`);
CREATE UNIQUE INDEX `route_interests_origin_dest_unique` ON `route_interests` (`origin_city`, `origin_country`, `destination_city`, `destination_country`);

CREATE TABLE `route_interest_expressions` (
  `id` text PRIMARY KEY NOT NULL,
  `display_id` text NOT NULL,
  `human_id` text NOT NULL REFERENCES `humans`(`id`),
  `route_interest_id` text NOT NULL REFERENCES `route_interests`(`id`),
  `activity_id` text REFERENCES `activities`(`id`),
  `frequency` text NOT NULL DEFAULT 'one_time',
  `travel_year` integer,
  `travel_month` integer,
  `travel_day` integer,
  `notes` text,
  `created_at` text NOT NULL
);

CREATE UNIQUE INDEX `route_interest_expressions_display_id_unique` ON `route_interest_expressions` (`display_id`);
CREATE INDEX `route_interest_expressions_human_id_idx` ON `route_interest_expressions` (`human_id`);
CREATE INDEX `route_interest_expressions_route_interest_id_idx` ON `route_interest_expressions` (`route_interest_id`);

INSERT INTO `display_id_counters` (`prefix`, `counter`) VALUES ('ROI', 0);
INSERT INTO `display_id_counters` (`prefix`, `counter`) VALUES ('REX', 0);
