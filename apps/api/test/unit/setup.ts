import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@humans/db/schema";
import { beforeAll, afterEach } from "vitest";
import type { DrizzleD1Database } from "drizzle-orm/d1";

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

  // ── Depend on humans + colleagues + accounts ──────────────────────
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
    \`display_id\` text NOT NULL UNIQUE,
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
  `CREATE UNIQUE INDEX IF NOT EXISTS \`email_labels_config_name_unique\` ON \`email_labels_config\` (\`name\`)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`phone_labels_config_name_unique\` ON \`phone_labels_config\` (\`name\`)`,
  `CREATE INDEX IF NOT EXISTS \`emails_owner_type_owner_id_idx\` ON \`emails\` (\`owner_type\`, \`owner_id\`)`,
  `CREATE INDEX IF NOT EXISTS \`phones_owner_type_owner_id_idx\` ON \`phones\` (\`owner_type\`, \`owner_id\`)`,
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
  "account_humans",
  "account_types",
  "lead_events",
  "pets",
  "human_route_signups",
  "phones",
  "human_types",
  "emails",
  "audit_log",
  "error_log",
  "geo_interests",
  "account_human_labels_config",
  "account_types_config",
  "email_labels_config",
  "phone_labels_config",
  "display_id_counters",
  "accounts",
  "lead_sources",
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
