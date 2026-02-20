import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@humans/db/schema";
import { beforeAll, afterEach } from "vitest";
import type { DrizzleD1Database } from "drizzle-orm/d1";

// Complete schema matching all migrations (0000–0009).
// Tables ordered so parents are created before children (FK-safe).
const MIGRATION_STATEMENTS = [
  // ── Independent tables (no foreign keys) ──────────────────────────
  `CREATE TABLE IF NOT EXISTS \`colleagues\` (
    \`id\` text PRIMARY KEY NOT NULL,
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
    \`first_name\` text NOT NULL,
    \`middle_name\` text,
    \`last_name\` text NOT NULL,
    \`status\` text DEFAULT 'open' NOT NULL,
    \`created_at\` text NOT NULL,
    \`updated_at\` text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS \`flights\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`flight_number\` text NOT NULL,
    \`departure_airport\` text NOT NULL,
    \`arrival_airport\` text NOT NULL,
    \`departure_date\` text NOT NULL,
    \`arrival_date\` text NOT NULL,
    \`airline\` text NOT NULL,
    \`cabin_class\` text,
    \`max_pets\` integer NOT NULL,
    \`status\` text DEFAULT 'scheduled' NOT NULL,
    \`created_at\` text NOT NULL,
    \`updated_at\` text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS \`lead_sources\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`name\` text NOT NULL,
    \`category\` text NOT NULL,
    \`is_active\` integer DEFAULT true NOT NULL,
    \`created_at\` text NOT NULL,
    \`updated_at\` text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS \`accounts\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`name\` text NOT NULL,
    \`status\` text DEFAULT 'open' NOT NULL,
    \`created_at\` text NOT NULL,
    \`updated_at\` text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS \`error_log\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`request_id\` text NOT NULL,
    \`code\` text NOT NULL,
    \`message\` text NOT NULL,
    \`status\` integer NOT NULL,
    \`method\` text,
    \`path\` text,
    \`user_id\` text,
    \`details\` text,
    \`stack\` text,
    \`created_at\` text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS \`geo_interests\` (
    \`id\` text PRIMARY KEY NOT NULL,
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
  `CREATE TABLE IF NOT EXISTS \`account_email_labels_config\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`name\` text NOT NULL,
    \`created_at\` text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS \`account_phone_labels_config\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`name\` text NOT NULL,
    \`created_at\` text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS \`human_email_labels_config\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`name\` text NOT NULL,
    \`created_at\` text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS \`human_phone_labels_config\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`name\` text NOT NULL,
    \`created_at\` text NOT NULL
  )`,

  // ── Depend on humans + label configs ──────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`human_emails\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`human_id\` text NOT NULL,
    \`email\` text NOT NULL,
    \`label_id\` text REFERENCES \`human_email_labels_config\`(\`id\`),
    \`is_primary\` integer DEFAULT false NOT NULL,
    \`created_at\` text NOT NULL,
    FOREIGN KEY (\`human_id\`) REFERENCES \`humans\`(\`id\`) ON UPDATE no action ON DELETE no action
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
  `CREATE TABLE IF NOT EXISTS \`human_phone_numbers\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`human_id\` text NOT NULL,
    \`phone_number\` text NOT NULL,
    \`label_id\` text REFERENCES \`human_phone_labels_config\`(\`id\`),
    \`has_whatsapp\` integer DEFAULT 0 NOT NULL,
    \`is_primary\` integer DEFAULT 0 NOT NULL,
    \`created_at\` text NOT NULL,
    FOREIGN KEY (\`human_id\`) REFERENCES \`humans\`(\`id\`) ON UPDATE no action ON DELETE no action
  )`,

  // ── Depend on colleagues ──────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`clients\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`first_name\` text NOT NULL,
    \`last_name\` text NOT NULL,
    \`email\` text NOT NULL,
    \`phone\` text,
    \`address\` text,
    \`status\` text DEFAULT 'prospect' NOT NULL,
    \`notes\` text,
    \`lead_source_id\` text,
    \`assigned_to_user_id\` text,
    \`created_at\` text NOT NULL,
    \`updated_at\` text NOT NULL,
    FOREIGN KEY (\`assigned_to_user_id\`) REFERENCES \`colleagues\`(\`id\`) ON UPDATE no action ON DELETE no action
  )`,
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

  // ── Depend on clients ─────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`pets\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`client_id\` text,
    \`human_id\` text,
    \`name\` text NOT NULL,
    \`breed\` text,
    \`weight\` real,
    \`age\` integer,
    \`special_needs\` text,
    \`health_cert_r2_key\` text,
    \`vaccination_r2_key\` text,
    \`is_active\` integer DEFAULT true NOT NULL,
    \`created_at\` text NOT NULL,
    \`updated_at\` text NOT NULL,
    FOREIGN KEY (\`client_id\`) REFERENCES \`clients\`(\`id\`) ON UPDATE no action ON DELETE no action,
    FOREIGN KEY (\`human_id\`) REFERENCES \`humans\`(\`id\`) ON UPDATE no action ON DELETE no action
  )`,
  `CREATE TABLE IF NOT EXISTS \`lead_events\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`client_id\` text NOT NULL,
    \`event_type\` text NOT NULL,
    \`notes\` text,
    \`metadata\` text,
    \`created_by_user_id\` text,
    \`created_at\` text NOT NULL,
    FOREIGN KEY (\`client_id\`) REFERENCES \`clients\`(\`id\`) ON UPDATE no action ON DELETE no action,
    FOREIGN KEY (\`created_by_user_id\`) REFERENCES \`colleagues\`(\`id\`) ON UPDATE no action ON DELETE no action
  )`,

  // ── Depend on flights + clients + pets ────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`flight_bookings\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`flight_id\` text NOT NULL,
    \`client_id\` text NOT NULL,
    \`pet_id\` text NOT NULL,
    \`human_id\` text,
    \`booking_status\` text DEFAULT 'pending' NOT NULL,
    \`price\` integer NOT NULL,
    \`confirmation_r2_key\` text,
    \`special_instructions\` text,
    \`created_at\` text NOT NULL,
    \`updated_at\` text NOT NULL,
    FOREIGN KEY (\`flight_id\`) REFERENCES \`flights\`(\`id\`) ON UPDATE no action ON DELETE no action,
    FOREIGN KEY (\`client_id\`) REFERENCES \`clients\`(\`id\`) ON UPDATE no action ON DELETE no action,
    FOREIGN KEY (\`pet_id\`) REFERENCES \`pets\`(\`id\`) ON UPDATE no action ON DELETE no action,
    FOREIGN KEY (\`human_id\`) REFERENCES \`humans\`(\`id\`) ON UPDATE no action ON DELETE no action
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
  `CREATE TABLE IF NOT EXISTS \`account_emails\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`account_id\` text NOT NULL REFERENCES \`accounts\`(\`id\`),
    \`email\` text NOT NULL,
    \`label_id\` text REFERENCES \`account_email_labels_config\`(\`id\`),
    \`is_primary\` integer NOT NULL DEFAULT 0,
    \`created_at\` text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS \`account_phone_numbers\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`account_id\` text NOT NULL REFERENCES \`accounts\`(\`id\`),
    \`phone_number\` text NOT NULL,
    \`label_id\` text REFERENCES \`account_phone_labels_config\`(\`id\`),
    \`has_whatsapp\` integer NOT NULL DEFAULT 0,
    \`is_primary\` integer NOT NULL DEFAULT 0,
    \`created_at\` text NOT NULL
  )`,

  // ── Depend on humans + colleagues + accounts ──────────────────────
  `CREATE TABLE IF NOT EXISTS \`activities\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`type\` text DEFAULT 'email' NOT NULL,
    \`subject\` text NOT NULL,
    \`body\` text,
    \`notes\` text,
    \`activity_date\` text NOT NULL,
    \`human_id\` text,
    \`account_id\` text REFERENCES \`accounts\`(\`id\`),
    \`route_signup_id\` text,
    \`gmail_id\` text,
    \`front_id\` text,
    \`created_by_user_id\` text NOT NULL,
    \`created_at\` text NOT NULL,
    \`updated_at\` text NOT NULL,
    FOREIGN KEY (\`human_id\`) REFERENCES \`humans\`(\`id\`) ON UPDATE no action ON DELETE no action,
    FOREIGN KEY (\`created_by_user_id\`) REFERENCES \`colleagues\`(\`id\`) ON UPDATE no action ON DELETE no action
  )`,

  // ── Depend on activities + geo_interests ──────────────────────────
  `CREATE TABLE IF NOT EXISTS \`geo_interest_expressions\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`human_id\` text NOT NULL REFERENCES \`humans\`(\`id\`),
    \`geo_interest_id\` text NOT NULL REFERENCES \`geo_interests\`(\`id\`),
    \`activity_id\` text REFERENCES \`activities\`(\`id\`),
    \`notes\` text,
    \`created_at\` text NOT NULL
  )`,

  // ── Indexes ───────────────────────────────────────────────────────
  `CREATE UNIQUE INDEX IF NOT EXISTS \`colleagues_email_unique\` ON \`colleagues\` (\`email\`)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`colleagues_google_id_unique\` ON \`colleagues\` (\`google_id\`)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`geo_interests_city_country_unique\` ON \`geo_interests\` (\`city\`, \`country\`)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`account_types_config_name_unique\` ON \`account_types_config\` (\`name\`)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`account_human_labels_config_name_unique\` ON \`account_human_labels_config\` (\`name\`)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`account_email_labels_config_name_unique\` ON \`account_email_labels_config\` (\`name\`)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`account_phone_labels_config_name_unique\` ON \`account_phone_labels_config\` (\`name\`)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`human_email_labels_config_name_unique\` ON \`human_email_labels_config\` (\`name\`)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`human_phone_labels_config_name_unique\` ON \`human_phone_labels_config\` (\`name\`)`,
  `CREATE INDEX IF NOT EXISTS \`error_log_request_id_idx\` ON \`error_log\` (\`request_id\`)`,
  `CREATE INDEX IF NOT EXISTS \`error_log_code_idx\` ON \`error_log\` (\`code\`)`,
  `CREATE INDEX IF NOT EXISTS \`error_log_created_at_idx\` ON \`error_log\` (\`created_at\`)`,
  `CREATE INDEX IF NOT EXISTS \`geo_interest_expressions_human_id_idx\` ON \`geo_interest_expressions\` (\`human_id\`)`,
  `CREATE INDEX IF NOT EXISTS \`geo_interest_expressions_geo_interest_id_idx\` ON \`geo_interest_expressions\` (\`geo_interest_id\`)`,
];

// Clean tables in FK-safe order (children first)
const CLEANUP_TABLES = [
  "geo_interest_expressions",
  "activities",
  "account_phone_numbers",
  "account_emails",
  "account_humans",
  "account_types",
  "flight_bookings",
  "lead_events",
  "pets",
  "human_route_signups",
  "human_phone_numbers",
  "human_types",
  "human_emails",
  "audit_log",
  "clients",
  "error_log",
  "geo_interests",
  "account_phone_labels_config",
  "account_email_labels_config",
  "account_human_labels_config",
  "account_types_config",
  "human_email_labels_config",
  "human_phone_labels_config",
  "accounts",
  "lead_sources",
  "flights",
  "humans",
  "colleagues",
];

const sqlite = new Database(":memory:");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite, { schema });

// Export the DB typed as DrizzleD1Database for service function compatibility.
// The better-sqlite3 Drizzle instance is structurally compatible.
export function getTestDb() {
  return db as unknown as DrizzleD1Database<typeof schema>;
}

beforeAll(() => {
  for (const stmt of MIGRATION_STATEMENTS) {
    sqlite.exec(stmt);
  }
});

afterEach(() => {
  for (const table of CLEANUP_TABLES) {
    sqlite.exec(`DELETE FROM ${table}`);
  }
});
