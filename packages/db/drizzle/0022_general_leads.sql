CREATE TABLE `general_leads` (
  `id` text PRIMARY KEY NOT NULL,
  `display_id` text NOT NULL,
  `status` text DEFAULT 'open' NOT NULL,
  `source` text NOT NULL,
  `notes` text,
  `reject_reason` text,
  `converted_human_id` text REFERENCES `humans`(`id`),
  `owner_id` text REFERENCES `colleagues`(`id`),
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);

CREATE UNIQUE INDEX `general_leads_display_id_unique` ON `general_leads` (`display_id`);

ALTER TABLE `activities` ADD COLUMN `general_lead_id` text REFERENCES `general_leads`(`id`);
