CREATE TABLE `referral_codes` (
  `id` text PRIMARY KEY NOT NULL,
  `display_id` text NOT NULL,
  `code` text NOT NULL,
  `description` text,
  `is_active` integer NOT NULL DEFAULT true,
  `human_id` text,
  `account_id` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);

CREATE UNIQUE INDEX `referral_codes_display_id_unique` ON `referral_codes` (`display_id`);
CREATE UNIQUE INDEX `referral_codes_code_unique` ON `referral_codes` (`code`);
CREATE INDEX `referral_codes_human_id_idx` ON `referral_codes` (`human_id`);
CREATE INDEX `referral_codes_account_id_idx` ON `referral_codes` (`account_id`);

INSERT INTO `display_id_counters` (`prefix`, `counter`) VALUES ('REF', 0);
