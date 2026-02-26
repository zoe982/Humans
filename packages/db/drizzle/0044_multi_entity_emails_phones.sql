-- Migration: Multi-entity emails & phones + general leads name fields
-- Replaces ownerType/ownerId polymorphic model with individual FK columns
-- Adds firstName/middleName/lastName to general_leads, removes source/email/phone

PRAGMA foreign_keys=OFF;

-- ═══════════════════════════════════════════════════════════════
-- 1. EMAILS: Replace owner_type/owner_id with per-entity FK columns
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE `emails_new` (
  `id` text PRIMARY KEY NOT NULL,
  `display_id` text NOT NULL UNIQUE,
  `human_id` text,
  `account_id` text,
  `general_lead_id` text,
  `website_booking_request_id` text,
  `route_signup_id` text,
  `email` text NOT NULL,
  `label_id` text,
  `is_primary` integer DEFAULT false NOT NULL,
  `created_at` text NOT NULL
);

INSERT INTO `emails_new` (`id`, `display_id`, `human_id`, `account_id`, `email`, `label_id`, `is_primary`, `created_at`)
SELECT `id`, `display_id`,
  CASE WHEN `owner_type` = 'human' THEN `owner_id` ELSE NULL END,
  CASE WHEN `owner_type` = 'account' THEN `owner_id` ELSE NULL END,
  `email`, `label_id`, `is_primary`, `created_at`
FROM `emails`;

DROP TABLE `emails`;
ALTER TABLE `emails_new` RENAME TO `emails`;

CREATE INDEX `emails_human_id_idx` ON `emails` (`human_id`);
CREATE INDEX `emails_account_id_idx` ON `emails` (`account_id`);
CREATE INDEX `emails_general_lead_id_idx` ON `emails` (`general_lead_id`);
CREATE INDEX `emails_website_booking_request_id_idx` ON `emails` (`website_booking_request_id`);
CREATE INDEX `emails_route_signup_id_idx` ON `emails` (`route_signup_id`);

-- ═══════════════════════════════════════════════════════════════
-- 2. PHONES: Replace owner_type/owner_id with per-entity FK columns
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE `phones_new` (
  `id` text PRIMARY KEY NOT NULL,
  `display_id` text NOT NULL UNIQUE,
  `human_id` text,
  `account_id` text,
  `general_lead_id` text,
  `website_booking_request_id` text,
  `route_signup_id` text,
  `phone_number` text NOT NULL,
  `label_id` text,
  `has_whatsapp` integer DEFAULT 0 NOT NULL,
  `is_primary` integer DEFAULT 0 NOT NULL,
  `created_at` text NOT NULL
);

INSERT INTO `phones_new` (`id`, `display_id`, `human_id`, `account_id`, `phone_number`, `label_id`, `has_whatsapp`, `is_primary`, `created_at`)
SELECT `id`, `display_id`,
  CASE WHEN `owner_type` = 'human' THEN `owner_id` ELSE NULL END,
  CASE WHEN `owner_type` = 'account' THEN `owner_id` ELSE NULL END,
  `phone_number`, `label_id`, `has_whatsapp`, `is_primary`, `created_at`
FROM `phones`;

DROP TABLE `phones`;
ALTER TABLE `phones_new` RENAME TO `phones`;

CREATE INDEX `phones_human_id_idx` ON `phones` (`human_id`);
CREATE INDEX `phones_account_id_idx` ON `phones` (`account_id`);
CREATE INDEX `phones_general_lead_id_idx` ON `phones` (`general_lead_id`);
CREATE INDEX `phones_website_booking_request_id_idx` ON `phones` (`website_booking_request_id`);
CREATE INDEX `phones_route_signup_id_idx` ON `phones` (`route_signup_id`);

-- ═══════════════════════════════════════════════════════════════
-- 3. GENERAL_LEADS: Add name fields, remove source/email/phone
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE `general_leads_new` (
  `id` text PRIMARY KEY NOT NULL,
  `display_id` text NOT NULL UNIQUE,
  `status` text DEFAULT 'open' NOT NULL,
  `first_name` text NOT NULL DEFAULT '',
  `middle_name` text,
  `last_name` text NOT NULL DEFAULT '',
  `notes` text,
  `reject_reason` text,
  `converted_human_id` text REFERENCES `humans`(`id`),
  `owner_id` text REFERENCES `colleagues`(`id`),
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);

INSERT INTO `general_leads_new` (`id`, `display_id`, `status`, `first_name`, `middle_name`, `last_name`, `notes`, `reject_reason`, `converted_human_id`, `owner_id`, `created_at`, `updated_at`)
SELECT `id`, `display_id`, `status`, '', NULL, '', `notes`, `reject_reason`, `converted_human_id`, `owner_id`, `created_at`, `updated_at`
FROM `general_leads`;

DROP TABLE `general_leads`;
ALTER TABLE `general_leads_new` RENAME TO `general_leads`;

PRAGMA foreign_keys=ON;
