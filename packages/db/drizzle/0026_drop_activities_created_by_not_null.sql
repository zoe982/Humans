-- Make created_by_user_id nullable on activities table.
-- This legacy column was replaced by colleague_id in migration 0019 but couldn't
-- be dropped due to SQLite FK constraints. The NOT NULL from migration 0007 causes
-- inserts to fail since the Drizzle schema no longer populates it.
-- SQLite cannot ALTER COLUMN, so we recreate the table.

PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `activities_new` (
	`id` text PRIMARY KEY NOT NULL,
	`display_id` text NOT NULL UNIQUE,
	`type` text DEFAULT 'email' NOT NULL,
	`subject` text NOT NULL,
	`body` text,
	`notes` text,
	`activity_date` text NOT NULL,
	`human_id` text,
	`account_id` text REFERENCES `accounts`(`id`),
	`route_signup_id` text,
	`website_booking_request_id` text,
	`opportunity_id` text REFERENCES `opportunities`(`id`),
	`general_lead_id` text REFERENCES `general_leads`(`id`),
	`gmail_id` text,
	`front_id` text,
	`front_conversation_id` text,
	`sync_run_id` text REFERENCES `front_sync_runs`(`id`),
	`colleague_id` text REFERENCES `colleagues`(`id`),
	`created_by_user_id` text REFERENCES `colleagues`(`id`),
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`human_id`) REFERENCES `humans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `activities_new` (
	`id`, `display_id`, `type`, `subject`, `body`, `notes`, `activity_date`,
	`human_id`, `account_id`, `route_signup_id`, `website_booking_request_id`,
	`opportunity_id`, `general_lead_id`, `gmail_id`, `front_id`, `front_conversation_id`,
	`sync_run_id`, `colleague_id`, `created_by_user_id`, `created_at`, `updated_at`
)
SELECT
	`id`, `display_id`, `type`, `subject`, `body`, `notes`, `activity_date`,
	`human_id`, `account_id`, `route_signup_id`, `website_booking_request_id`,
	`opportunity_id`, `general_lead_id`, `gmail_id`, `front_id`, `front_conversation_id`,
	`sync_run_id`, `colleague_id`, `created_by_user_id`, `created_at`, `updated_at`
FROM `activities`;
--> statement-breakpoint
DROP TABLE `activities`;
--> statement-breakpoint
ALTER TABLE `activities_new` RENAME TO `activities`;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
