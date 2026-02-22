/// <reference types="@cloudflare/vitest-pool-workers" />
import { env } from "cloudflare:test";
import { beforeAll, afterEach } from "vitest";

// Complete schema matching current migrations.
// Tables ordered so parents are created before children (FK-safe).
const MIGRATION_STATEMENTS = [
  // ── Independent tables (no foreign keys) ──────────────────────────
  `CREATE TABLE IF NOT EXISTS \`colleagues\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`display_id\` text NOT NULL UNIQUE,
    \`email\` text NOT NULL,
    \`first_name\` text NOT NULL,
    \`middle_names\` text,
    \`last_name\` text NOT NULL,
    \`name\` text NOT NULL,
    \`avatar_url\` text,
    \`google_id\` text,
    \`role\` text DEFAULT 'viewer' NOT NULL,
    \`is_active\` integer DEFAULT 1 NOT NULL,
    \`created_at\` text NOT NULL,
    \`updated_at\` text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS \`humans\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`display_id\` text NOT NULL UNIQUE,
    \`first_name\` text NOT NULL,
    \`middle_name\` text,
    \`last_name\` text NOT NULL,
    \`status\` text DEFAULT 'open' NOT NULL,
    \`created_at\` text NOT NULL,
    \`updated_at\` text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS \`lead_sources\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`display_id\` text NOT NULL UNIQUE,
    \`name\` text NOT NULL,
    \`category\` text NOT NULL,
    \`is_active\` integer DEFAULT true NOT NULL,
    \`created_at\` text NOT NULL,
    \`updated_at\` text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS \`accounts\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`display_id\` text NOT NULL UNIQUE,
    \`name\` text NOT NULL,
    \`status\` text DEFAULT 'open' NOT NULL,
    \`created_at\` text NOT NULL,
    \`updated_at\` text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS \`error_log\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`display_id\` text NOT NULL,
    \`request_id\` text NOT NULL,
    \`code\` text NOT NULL,
    \`message\` text NOT NULL,
    \`status\` integer NOT NULL,
    \`resolution_status\` text NOT NULL DEFAULT 'open',
    \`method\` text,
    \`path\` text,
    \`user_id\` text,
    \`details\` text,
    \`stack\` text,
    \`created_at\` text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS \`geo_interests\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`display_id\` text NOT NULL UNIQUE,
    \`city\` text NOT NULL,
    \`country\` text NOT NULL,
    \`created_at\` text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS \`account_types_config\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`name\` text NOT NULL,
    \`created_at\` text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS \`account_human_labels_config\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`name\` text NOT NULL,
    \`created_at\` text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS \`email_labels_config\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`name\` text NOT NULL,
    \`created_at\` text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS \`phone_labels_config\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`name\` text NOT NULL,
    \`created_at\` text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS \`display_id_counters\` (
    \`prefix\` text PRIMARY KEY NOT NULL,
    \`counter\` integer NOT NULL DEFAULT 0
  )`,

  // ── Depend on humans + label configs ──────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`emails\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`display_id\` text NOT NULL UNIQUE,
    \`owner_type\` text NOT NULL,
    \`owner_id\` text NOT NULL,
    \`email\` text NOT NULL,
    \`label_id\` text REFERENCES \`email_labels_config\`(\`id\`),
    \`is_primary\` integer DEFAULT false NOT NULL,
    \`created_at\` text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS \`human_types\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`human_id\` text NOT NULL,
    \`type\` text NOT NULL,
    \`created_at\` text NOT NULL,
    FOREIGN KEY (\`human_id\`) REFERENCES \`humans\`(\`id\`) ON UPDATE no action ON DELETE no action
  )`,
  `CREATE TABLE IF NOT EXISTS \`human_route_signups\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`human_id\` text NOT NULL,
    \`route_signup_id\` text NOT NULL,
    \`linked_at\` text NOT NULL,
    FOREIGN KEY (\`human_id\`) REFERENCES \`humans\`(\`id\`) ON UPDATE no action ON DELETE no action
  )`,
  `CREATE TABLE IF NOT EXISTS \`human_website_booking_requests\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`human_id\` text NOT NULL,
    \`website_booking_request_id\` text NOT NULL,
    \`linked_at\` text NOT NULL,
    FOREIGN KEY (\`human_id\`) REFERENCES \`humans\`(\`id\`) ON UPDATE no action ON DELETE no action
  )`,
  `CREATE TABLE IF NOT EXISTS \`phones\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`display_id\` text NOT NULL UNIQUE,
    \`owner_type\` text NOT NULL,
    \`owner_id\` text NOT NULL,
    \`phone_number\` text NOT NULL,
    \`label_id\` text REFERENCES \`phone_labels_config\`(\`id\`),
    \`has_whatsapp\` integer DEFAULT 0 NOT NULL,
    \`is_primary\` integer DEFAULT 0 NOT NULL,
    \`created_at\` text NOT NULL
  )`,

  // ── Depend on colleagues ──────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`audit_log\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`user_id\` text,
    \`action\` text NOT NULL,
    \`entity_type\` text NOT NULL,
    \`entity_id\` text NOT NULL,
    \`changes\` text,
    \`ip_address\` text,
    \`created_at\` text NOT NULL,
    FOREIGN KEY (\`user_id\`) REFERENCES \`colleagues\`(\`id\`) ON UPDATE no action ON DELETE no action
  )`,

  // ── Depend on humans ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`pets\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`display_id\` text NOT NULL UNIQUE,
    \`human_id\` text,
    \`type\` text NOT NULL DEFAULT 'dog',
    \`name\` text NOT NULL,
    \`breed\` text,
    \`weight\` real,
    \`is_active\` integer DEFAULT true NOT NULL,
    \`created_at\` text NOT NULL,
    \`updated_at\` text NOT NULL,
    FOREIGN KEY (\`human_id\`) REFERENCES \`humans\`(\`id\`) ON UPDATE no action ON DELETE no action
  )`,
  `CREATE TABLE IF NOT EXISTS \`lead_events\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`display_id\` text NOT NULL UNIQUE,
    \`human_id\` text NOT NULL,
    \`event_type\` text NOT NULL,
    \`notes\` text,
    \`metadata\` text,
    \`created_by_user_id\` text,
    \`created_at\` text NOT NULL,
    FOREIGN KEY (\`human_id\`) REFERENCES \`humans\`(\`id\`) ON UPDATE no action ON DELETE no action,
    FOREIGN KEY (\`created_by_user_id\`) REFERENCES \`colleagues\`(\`id\`) ON UPDATE no action ON DELETE no action
  )`,

  // ── Depend on accounts + config tables ────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`account_types\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`account_id\` text NOT NULL REFERENCES \`accounts\`(\`id\`),
    \`type_id\` text NOT NULL REFERENCES \`account_types_config\`(\`id\`),
    \`created_at\` text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS \`account_humans\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`account_id\` text NOT NULL REFERENCES \`accounts\`(\`id\`),
    \`human_id\` text NOT NULL REFERENCES \`humans\`(\`id\`),
    \`label_id\` text REFERENCES \`account_human_labels_config\`(\`id\`),
    \`created_at\` text NOT NULL
  )`,

  // ── Depend on colleagues (front_sync_runs) ───────────────────────
  `CREATE TABLE IF NOT EXISTS \`front_sync_runs\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`display_id\` text NOT NULL UNIQUE,
    \`status\` text NOT NULL DEFAULT 'running',
    \`started_at\` text NOT NULL,
    \`completed_at\` text,
    \`total_messages\` integer NOT NULL DEFAULT 0,
    \`imported\` integer NOT NULL DEFAULT 0,
    \`skipped\` integer NOT NULL DEFAULT 0,
    \`unmatched\` integer NOT NULL DEFAULT 0,
    \`error_count\` integer NOT NULL DEFAULT 0,
    \`error_messages\` text,
    \`linked_to_humans\` integer NOT NULL DEFAULT 0,
    \`linked_to_accounts\` integer NOT NULL DEFAULT 0,
    \`linked_to_route_signups\` integer NOT NULL DEFAULT 0,
    \`linked_to_bookings\` integer NOT NULL DEFAULT 0,
    \`linked_to_colleagues\` integer NOT NULL DEFAULT 0,
    \`initiated_by_colleague_id\` text REFERENCES \`colleagues\`(\`id\`),
    \`created_at\` text NOT NULL
  )`,

  // ── General Leads (depends on humans + colleagues) ─────────────
  `CREATE TABLE IF NOT EXISTS \`general_leads\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`display_id\` text NOT NULL UNIQUE,
    \`status\` text DEFAULT 'open' NOT NULL,
    \`source\` text NOT NULL,
    \`notes\` text,
    \`reject_reason\` text,
    \`converted_human_id\` text REFERENCES \`humans\`(\`id\`),
    \`owner_id\` text REFERENCES \`colleagues\`(\`id\`),
    \`created_at\` text NOT NULL,
    \`updated_at\` text NOT NULL
  )`,

  // ── Depend on humans + colleagues + accounts + front_sync_runs + general_leads ──
  `CREATE TABLE IF NOT EXISTS \`activities\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`display_id\` text NOT NULL UNIQUE,
    \`type\` text DEFAULT 'email' NOT NULL,
    \`subject\` text NOT NULL,
    \`body\` text,
    \`notes\` text,
    \`activity_date\` text NOT NULL,
    \`human_id\` text,
    \`account_id\` text REFERENCES \`accounts\`(\`id\`),
    \`route_signup_id\` text,
    \`website_booking_request_id\` text,
    \`opportunity_id\` text REFERENCES \`opportunities\`(\`id\`),
    \`general_lead_id\` text REFERENCES \`general_leads\`(\`id\`),
    \`gmail_id\` text,
    \`front_id\` text,
    \`front_conversation_id\` text,
    \`sync_run_id\` text REFERENCES \`front_sync_runs\`(\`id\`),
    \`colleague_id\` text REFERENCES \`colleagues\`(\`id\`),
    \`created_at\` text NOT NULL,
    \`updated_at\` text NOT NULL,
    FOREIGN KEY (\`human_id\`) REFERENCES \`humans\`(\`id\`) ON UPDATE no action ON DELETE no action
  )`,

  // ── Depend on activities + geo_interests ──────────────────────────
  `CREATE TABLE IF NOT EXISTS \`geo_interest_expressions\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`display_id\` text NOT NULL UNIQUE,
    \`human_id\` text NOT NULL REFERENCES \`humans\`(\`id\`),
    \`geo_interest_id\` text NOT NULL REFERENCES \`geo_interests\`(\`id\`),
    \`activity_id\` text REFERENCES \`activities\`(\`id\`),
    \`notes\` text,
    \`created_at\` text NOT NULL
  )`,

  // ── Route interests ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`route_interests\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`display_id\` text NOT NULL UNIQUE,
    \`origin_city\` text NOT NULL,
    \`origin_country\` text NOT NULL,
    \`destination_city\` text NOT NULL,
    \`destination_country\` text NOT NULL,
    \`created_at\` text NOT NULL,
    \`updated_at\` text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS \`route_interest_expressions\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`display_id\` text NOT NULL UNIQUE,
    \`human_id\` text NOT NULL REFERENCES \`humans\`(\`id\`),
    \`route_interest_id\` text NOT NULL REFERENCES \`route_interests\`(\`id\`),
    \`activity_id\` text REFERENCES \`activities\`(\`id\`),
    \`frequency\` text NOT NULL DEFAULT 'one_time',
    \`travel_year\` integer,
    \`travel_month\` integer,
    \`travel_day\` integer,
    \`notes\` text,
    \`created_at\` text NOT NULL
  )`,

  // ── Social IDs ──────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`social_id_platforms_config\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`name\` text NOT NULL,
    \`created_at\` text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS \`social_ids\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`display_id\` text NOT NULL UNIQUE,
    \`handle\` text NOT NULL,
    \`platform_id\` text REFERENCES \`social_id_platforms_config\`(\`id\`),
    \`human_id\` text,
    \`account_id\` text,
    \`created_at\` text NOT NULL
  )`,

  // ── Opportunities ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`opportunity_human_roles_config\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`name\` text NOT NULL UNIQUE,
    \`created_at\` text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS \`opportunities\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`display_id\` text NOT NULL UNIQUE,
    \`stage\` text NOT NULL DEFAULT 'open',
    \`seats_requested\` integer NOT NULL DEFAULT 1,
    \`notes\` text,
    \`next_action_start_date\` text,
    \`passenger_seats\` integer NOT NULL DEFAULT 1,
    \`pet_seats\` integer NOT NULL DEFAULT 0,
    \`loss_reason\` text,
    \`next_action_owner_id\` text REFERENCES \`colleagues\`(\`id\`),
    \`next_action_description\` text,
    \`next_action_type\` text,
    \`next_action_due_date\` text,
    \`next_action_completed_at\` text,
    \`created_at\` text NOT NULL,
    \`updated_at\` text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS \`opportunity_humans\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`opportunity_id\` text NOT NULL REFERENCES \`opportunities\`(\`id\`),
    \`human_id\` text NOT NULL REFERENCES \`humans\`(\`id\`),
    \`role_id\` text REFERENCES \`opportunity_human_roles_config\`(\`id\`),
    \`created_at\` text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS \`opportunity_pets\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`opportunity_id\` text NOT NULL REFERENCES \`opportunities\`(\`id\`),
    \`pet_id\` text NOT NULL REFERENCES \`pets\`(\`id\`),
    \`created_at\` text NOT NULL
  )`,

  // ── Additional label configs ────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`account_email_labels_config\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`name\` text NOT NULL UNIQUE,
    \`created_at\` text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS \`account_phone_labels_config\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`name\` text NOT NULL UNIQUE,
    \`created_at\` text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS \`human_email_labels_config\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`name\` text NOT NULL UNIQUE,
    \`created_at\` text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS \`human_phone_labels_config\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`name\` text NOT NULL UNIQUE,
    \`created_at\` text NOT NULL
  )`,

  // ── Indexes ───────────────────────────────────────────────────────
  `CREATE UNIQUE INDEX IF NOT EXISTS \`colleagues_email_unique\` ON \`colleagues\` (\`email\`)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`colleagues_google_id_unique\` ON \`colleagues\` (\`google_id\`)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`geo_interests_city_country_unique\` ON \`geo_interests\` (\`city\`, \`country\`)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`account_types_config_name_unique\` ON \`account_types_config\` (\`name\`)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`account_human_labels_config_name_unique\` ON \`account_human_labels_config\` (\`name\`)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`email_labels_config_name_unique\` ON \`email_labels_config\` (\`name\`)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`phone_labels_config_name_unique\` ON \`phone_labels_config\` (\`name\`)`,
  `CREATE INDEX IF NOT EXISTS \`emails_owner_type_owner_id_idx\` ON \`emails\` (\`owner_type\`, \`owner_id\`)`,
  `CREATE INDEX IF NOT EXISTS \`phones_owner_type_owner_id_idx\` ON \`phones\` (\`owner_type\`, \`owner_id\`)`,
  `CREATE INDEX IF NOT EXISTS \`error_log_request_id_idx\` ON \`error_log\` (\`request_id\`)`,
  `CREATE INDEX IF NOT EXISTS \`error_log_code_idx\` ON \`error_log\` (\`code\`)`,
  `CREATE INDEX IF NOT EXISTS \`error_log_created_at_idx\` ON \`error_log\` (\`created_at\`)`,
  `CREATE INDEX IF NOT EXISTS \`geo_interest_expressions_human_id_idx\` ON \`geo_interest_expressions\` (\`human_id\`)`,
  `CREATE INDEX IF NOT EXISTS \`geo_interest_expressions_geo_interest_id_idx\` ON \`geo_interest_expressions\` (\`geo_interest_id\`)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`route_interests_origin_dest_unique\` ON \`route_interests\` (\`origin_city\`, \`origin_country\`, \`destination_city\`, \`destination_country\`)`,
  `CREATE INDEX IF NOT EXISTS \`route_interest_expressions_human_id_idx\` ON \`route_interest_expressions\` (\`human_id\`)`,
  `CREATE INDEX IF NOT EXISTS \`route_interest_expressions_route_interest_id_idx\` ON \`route_interest_expressions\` (\`route_interest_id\`)`,
  `CREATE INDEX IF NOT EXISTS \`social_ids_human_id_idx\` ON \`social_ids\` (\`human_id\`)`,
  `CREATE INDEX IF NOT EXISTS \`social_ids_account_id_idx\` ON \`social_ids\` (\`account_id\`)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`error_log_display_id_idx\` ON \`error_log\` (\`display_id\`)`,
  `CREATE INDEX IF NOT EXISTS \`error_log_resolution_status_idx\` ON \`error_log\` (\`resolution_status\`)`,
  `CREATE INDEX IF NOT EXISTS \`opportunity_humans_opportunity_id_idx\` ON \`opportunity_humans\` (\`opportunity_id\`)`,
  `CREATE INDEX IF NOT EXISTS \`opportunity_humans_human_id_idx\` ON \`opportunity_humans\` (\`human_id\`)`,
  `CREATE INDEX IF NOT EXISTS \`opportunity_pets_opportunity_id_idx\` ON \`opportunity_pets\` (\`opportunity_id\`)`,
  `CREATE INDEX IF NOT EXISTS \`opportunity_pets_pet_id_idx\` ON \`opportunity_pets\` (\`pet_id\`)`,
];

beforeAll(async () => {
  for (const stmt of MIGRATION_STATEMENTS) {
    await env.DB.prepare(stmt).run();
  }
});

// Clean up between tests — children before parents (FK-safe deletion order)
afterEach(async () => {
  await env.DB.exec("DELETE FROM route_interest_expressions");
  await env.DB.exec("DELETE FROM geo_interest_expressions");
  await env.DB.exec("DELETE FROM social_ids");
  await env.DB.exec("DELETE FROM opportunity_pets");
  await env.DB.exec("DELETE FROM opportunity_humans");
  await env.DB.exec("DELETE FROM activities");
  await env.DB.exec("DELETE FROM general_leads");
  await env.DB.exec("DELETE FROM account_humans");
  await env.DB.exec("DELETE FROM account_types");
  await env.DB.exec("DELETE FROM lead_events");
  await env.DB.exec("DELETE FROM pets");
  await env.DB.exec("DELETE FROM human_route_signups");
  await env.DB.exec("DELETE FROM human_website_booking_requests");
  await env.DB.exec("DELETE FROM phones");
  await env.DB.exec("DELETE FROM human_types");
  await env.DB.exec("DELETE FROM emails");
  await env.DB.exec("DELETE FROM audit_log");
  await env.DB.exec("DELETE FROM error_log");
  await env.DB.exec("DELETE FROM front_sync_runs");
  await env.DB.exec("DELETE FROM route_interests");
  await env.DB.exec("DELETE FROM geo_interests");
  await env.DB.exec("DELETE FROM social_id_platforms_config");
  await env.DB.exec("DELETE FROM account_email_labels_config");
  await env.DB.exec("DELETE FROM account_phone_labels_config");
  await env.DB.exec("DELETE FROM human_email_labels_config");
  await env.DB.exec("DELETE FROM human_phone_labels_config");
  await env.DB.exec("DELETE FROM account_human_labels_config");
  await env.DB.exec("DELETE FROM account_types_config");
  await env.DB.exec("DELETE FROM email_labels_config");
  await env.DB.exec("DELETE FROM phone_labels_config");
  await env.DB.exec("DELETE FROM opportunities");
  await env.DB.exec("DELETE FROM opportunity_human_roles_config");
  await env.DB.exec("DELETE FROM display_id_counters");
  await env.DB.exec("DELETE FROM accounts");
  await env.DB.exec("DELETE FROM lead_sources");
  await env.DB.exec("DELETE FROM humans");
  await env.DB.exec("DELETE FROM colleagues");
});
