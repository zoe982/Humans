CREATE TABLE `entity_next_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`owner_id` text REFERENCES `colleagues`(`id`),
	`description` text,
	`type` text,
	`start_date` text,
	`due_date` text,
	`completed_at` text,
	`cadence_note` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entity_next_actions_entity_type_entity_id_unique` ON `entity_next_actions` (`entity_type`,`entity_id`);
