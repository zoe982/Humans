CREATE TABLE `activity_opportunities` (
	`id` text PRIMARY KEY NOT NULL,
	`activity_id` text NOT NULL REFERENCES `activities`(`id`),
	`opportunity_id` text NOT NULL REFERENCES `opportunities`(`id`),
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `activity_opportunities_activity_opportunity_idx` ON `activity_opportunities` (`activity_id`,`opportunity_id`);
--> statement-breakpoint
CREATE INDEX `activity_opportunities_activity_id_idx` ON `activity_opportunities` (`activity_id`);
--> statement-breakpoint
CREATE INDEX `activity_opportunities_opportunity_id_idx` ON `activity_opportunities` (`opportunity_id`);
