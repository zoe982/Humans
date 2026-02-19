-- Fix foreign key references from old `users` table to `colleagues`
-- Affected tables: activities, audit_log, clients, lead_events (all empty)

PRAGMA foreign_keys=OFF;
--> statement-breakpoint
DROP TABLE IF EXISTS `activities`;
--> statement-breakpoint
CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text DEFAULT 'email' NOT NULL,
	`subject` text NOT NULL,
	`body` text,
	`notes` text,
	`activity_date` text NOT NULL,
	`human_id` text,
	`account_id` text REFERENCES `accounts`(`id`),
	`route_signup_id` text,
	`gmail_id` text,
	`front_id` text,
	`created_by_user_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`human_id`) REFERENCES `humans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `colleagues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
DROP TABLE IF EXISTS `audit_log`;
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`changes` text,
	`ip_address` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `colleagues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
DROP TABLE IF EXISTS `lead_events`;
--> statement-breakpoint
CREATE TABLE `lead_events` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`event_type` text NOT NULL,
	`notes` text,
	`metadata` text,
	`created_by_user_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `colleagues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
DROP TABLE IF EXISTS `clients`;
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`address` text,
	`status` text DEFAULT 'prospect' NOT NULL,
	`notes` text,
	`lead_source_id` text,
	`assigned_to_user_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`assigned_to_user_id`) REFERENCES `colleagues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
