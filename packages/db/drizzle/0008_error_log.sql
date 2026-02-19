CREATE TABLE `error_log` (
  `id` text PRIMARY KEY NOT NULL,
  `request_id` text NOT NULL,
  `code` text NOT NULL,
  `message` text NOT NULL,
  `status` integer NOT NULL,
  `method` text,
  `path` text,
  `user_id` text,
  `details` text,
  `stack` text,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `error_log_request_id_idx` ON `error_log` (`request_id`);
--> statement-breakpoint
CREATE INDEX `error_log_code_idx` ON `error_log` (`code`);
--> statement-breakpoint
CREATE INDEX `error_log_created_at_idx` ON `error_log` (`created_at`);
