CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text DEFAULT 'email' NOT NULL,
	`subject` text NOT NULL,
	`body` text,
	`activity_date` text NOT NULL,
	`human_id` text,
	`route_signup_id` text,
	`created_by_user_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`human_id`) REFERENCES `humans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `human_emails` (
	`id` text PRIMARY KEY NOT NULL,
	`human_id` text NOT NULL,
	`email` text NOT NULL,
	`label` text DEFAULT 'personal' NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`human_id`) REFERENCES `humans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `human_route_signups` (
	`id` text PRIMARY KEY NOT NULL,
	`human_id` text NOT NULL,
	`route_signup_id` text NOT NULL,
	`linked_at` text NOT NULL,
	FOREIGN KEY (`human_id`) REFERENCES `humans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `human_types` (
	`id` text PRIMARY KEY NOT NULL,
	`human_id` text NOT NULL,
	`type` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`human_id`) REFERENCES `humans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `humans` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`middle_name` text,
	`last_name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
