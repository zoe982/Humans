/// <reference types="@cloudflare/vitest-pool-workers" />
import { env } from "cloudflare:test";
import { beforeAll, afterEach } from "vitest";

// Migration SQL split into individual statements
const MIGRATION_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS \`users\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`email\` text NOT NULL,
    \`name\` text NOT NULL,
    \`avatar_url\` text,
    \`google_id\` text,
    \`role\` text DEFAULT 'viewer' NOT NULL,
    \`is_active\` integer DEFAULT true NOT NULL,
    \`created_at\` text NOT NULL,
    \`updated_at\` text NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`users_email_unique\` ON \`users\` (\`email\`)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`users_google_id_unique\` ON \`users\` (\`google_id\`)`,
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
    FOREIGN KEY (\`assigned_to_user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE no action
  )`,
  `CREATE TABLE IF NOT EXISTS \`lead_sources\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`name\` text NOT NULL,
    \`category\` text NOT NULL,
    \`is_active\` integer DEFAULT true NOT NULL,
    \`created_at\` text NOT NULL,
    \`updated_at\` text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS \`pets\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`client_id\` text NOT NULL,
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
    FOREIGN KEY (\`client_id\`) REFERENCES \`clients\`(\`id\`) ON UPDATE no action ON DELETE no action
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
  `CREATE TABLE IF NOT EXISTS \`flight_bookings\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`flight_id\` text NOT NULL,
    \`client_id\` text NOT NULL,
    \`pet_id\` text NOT NULL,
    \`booking_status\` text DEFAULT 'pending' NOT NULL,
    \`price\` integer NOT NULL,
    \`confirmation_r2_key\` text,
    \`special_instructions\` text,
    \`created_at\` text NOT NULL,
    \`updated_at\` text NOT NULL,
    FOREIGN KEY (\`flight_id\`) REFERENCES \`flights\`(\`id\`) ON UPDATE no action ON DELETE no action,
    FOREIGN KEY (\`client_id\`) REFERENCES \`clients\`(\`id\`) ON UPDATE no action ON DELETE no action,
    FOREIGN KEY (\`pet_id\`) REFERENCES \`pets\`(\`id\`) ON UPDATE no action ON DELETE no action
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
    FOREIGN KEY (\`created_by_user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE no action
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
    FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE no action
  )`,
];

beforeAll(async () => {
  for (const stmt of MIGRATION_STATEMENTS) {
    await env.DB.prepare(stmt).run();
  }
});

// Clean up between tests in insertion-safe order (children before parents)
afterEach(async () => {
  await env.DB.exec("DELETE FROM flight_bookings");
  await env.DB.exec("DELETE FROM lead_events");
  await env.DB.exec("DELETE FROM audit_log");
  await env.DB.exec("DELETE FROM pets");
  await env.DB.exec("DELETE FROM clients");
  await env.DB.exec("DELETE FROM flights");
  await env.DB.exec("DELETE FROM lead_sources");
  await env.DB.exec("DELETE FROM users");
});
