import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@humans/db/schema";
import { beforeAll, afterEach } from "vitest";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

// Complete schema matching current migrations (PostgreSQL syntax).
// Tables ordered so parents are created before children (FK-safe).
const MIGRATION_STATEMENTS = [
  // ── Independent tables (no foreign keys) ──────────────────────────
  `CREATE TABLE IF NOT EXISTS "colleagues" (
    "id" text PRIMARY KEY NOT NULL,
    "display_id" text NOT NULL UNIQUE,
    "email" text NOT NULL,
    "first_name" text NOT NULL,
    "middle_names" text,
    "last_name" text NOT NULL,
    "name" text NOT NULL,
    "avatar_url" text,
    "google_id" text,
    "role" text DEFAULT 'viewer' NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" text NOT NULL,
    "updated_at" text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "humans" (
    "id" text PRIMARY KEY NOT NULL,
    "display_id" text NOT NULL UNIQUE,
    "first_name" text NOT NULL,
    "middle_name" text,
    "last_name" text NOT NULL,
    "status" text DEFAULT 'open' NOT NULL,
    "created_at" text NOT NULL,
    "updated_at" text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "lead_sources" (
    "id" text PRIMARY KEY NOT NULL,
    "display_id" text NOT NULL UNIQUE,
    "name" text NOT NULL,
    "category" text NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" text NOT NULL,
    "updated_at" text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "accounts" (
    "id" text PRIMARY KEY NOT NULL,
    "display_id" text NOT NULL UNIQUE,
    "name" text NOT NULL,
    "status" text DEFAULT 'open' NOT NULL,
    "created_at" text NOT NULL,
    "updated_at" text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "opportunities" (
    "id" text PRIMARY KEY NOT NULL,
    "display_id" text NOT NULL UNIQUE,
    "stage" text DEFAULT 'open' NOT NULL,
    "seats_requested" integer NOT NULL DEFAULT 1,
    "passenger_seats" integer NOT NULL DEFAULT 1,
    "pet_seats" integer NOT NULL DEFAULT 0,
    "notes" text,
    "loss_reason" text,
    "owner_id" text REFERENCES "colleagues"("id"),
    "next_action_owner_id" text REFERENCES "colleagues"("id"),
    "next_action_description" text,
    "next_action_type" text,
    "next_action_start_date" text,
    "next_action_due_date" text,
    "next_action_completed_at" text,
    "next_action_cadence_note" text,
    "flight_id" text,
    "created_at" text NOT NULL,
    "updated_at" text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "general_leads" (
    "id" text PRIMARY KEY NOT NULL,
    "display_id" text NOT NULL UNIQUE,
    "status" text DEFAULT 'open' NOT NULL,
    "stage" text DEFAULT 'open' NOT NULL,
    "first_name" text NOT NULL DEFAULT '',
    "middle_name" text,
    "last_name" text NOT NULL DEFAULT '',
    "notes" text,
    "reject_reason" text,
    "loss_reason" text,
    "converted_human_id" text REFERENCES "humans"("id"),
    "owner_id" text REFERENCES "colleagues"("id"),
    "front_conversation_id" text,
    "source" text,
    "channel" text,
    "created_at" text NOT NULL,
    "updated_at" text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "websites" (
    "id" text PRIMARY KEY NOT NULL,
    "display_id" text NOT NULL UNIQUE,
    "url" text NOT NULL,
    "human_id" text,
    "account_id" text,
    "created_at" text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "error_log" (
    "id" text PRIMARY KEY NOT NULL,
    "display_id" text NOT NULL,
    "request_id" text NOT NULL,
    "code" text NOT NULL,
    "message" text NOT NULL,
    "status" integer NOT NULL,
    "resolution_status" text NOT NULL DEFAULT 'open',
    "method" text,
    "path" text,
    "user_id" text,
    "details" jsonb,
    "stack" text,
    "created_at" text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "geo_interests" (
    "id" text PRIMARY KEY NOT NULL,
    "display_id" text NOT NULL UNIQUE,
    "city" text NOT NULL,
    "country" text NOT NULL,
    "created_at" text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "account_types_config" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "created_at" text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "account_human_labels_config" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "created_at" text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "email_labels_config" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "created_at" text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "phone_labels_config" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "created_at" text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "display_id_counters" (
    "prefix" text PRIMARY KEY NOT NULL,
    "counter" integer NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS "opportunity_human_roles_config" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL UNIQUE,
    "created_at" text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "lead_sources_config" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL UNIQUE,
    "created_at" text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "lead_channels_config" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL UNIQUE,
    "created_at" text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "loss_reasons_config" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "created_at" text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "opportunity_stage_cadence_config" (
    "id" text PRIMARY KEY NOT NULL,
    "stage" text NOT NULL UNIQUE,
    "cadence_hours" integer NOT NULL,
    "display_text" text NOT NULL,
    "created_at" text NOT NULL,
    "updated_at" text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "human_relationship_labels_config" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL UNIQUE,
    "created_at" text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "referral_codes" (
    "id" text PRIMARY KEY NOT NULL,
    "display_id" text NOT NULL UNIQUE,
    "code" text NOT NULL UNIQUE,
    "description" text,
    "is_active" boolean NOT NULL DEFAULT true,
    "human_id" text,
    "account_id" text,
    "created_at" text NOT NULL,
    "updated_at" text NOT NULL
  )`,

  // ── Depend on humans + label configs ──────────────────────────────
  `CREATE TABLE IF NOT EXISTS "emails" (
    "id" text PRIMARY KEY NOT NULL,
    "display_id" text NOT NULL UNIQUE,
    "human_id" text,
    "account_id" text,
    "general_lead_id" text,
    "website_booking_request_id" text,
    "route_signup_id" text,
    "email" text NOT NULL,
    "label_id" text,
    "is_primary" boolean DEFAULT false NOT NULL,
    "created_at" text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "human_types" (
    "id" text PRIMARY KEY NOT NULL,
    "human_id" text NOT NULL,
    "type" text NOT NULL,
    "created_at" text NOT NULL,
    FOREIGN KEY ("human_id") REFERENCES "humans"("id") ON UPDATE no action ON DELETE no action
  )`,
  `CREATE TABLE IF NOT EXISTS "human_route_signups" (
    "id" text PRIMARY KEY NOT NULL,
    "human_id" text NOT NULL,
    "route_signup_id" text NOT NULL,
    "linked_at" text NOT NULL,
    FOREIGN KEY ("human_id") REFERENCES "humans"("id") ON UPDATE no action ON DELETE no action
  )`,
  `CREATE TABLE IF NOT EXISTS "human_website_booking_requests" (
    "id" text PRIMARY KEY NOT NULL,
    "human_id" text NOT NULL,
    "website_booking_request_id" text NOT NULL,
    "opportunity_id" text REFERENCES "opportunities"("id"),
    "linked_at" text NOT NULL,
    FOREIGN KEY ("human_id") REFERENCES "humans"("id") ON UPDATE no action ON DELETE no action
  )`,
  `CREATE TABLE IF NOT EXISTS "phones" (
    "id" text PRIMARY KEY NOT NULL,
    "display_id" text NOT NULL UNIQUE,
    "human_id" text,
    "account_id" text,
    "general_lead_id" text,
    "website_booking_request_id" text,
    "route_signup_id" text,
    "phone_number" text NOT NULL,
    "label_id" text,
    "has_whatsapp" boolean DEFAULT false NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "created_at" text NOT NULL
  )`,

  // ── Depend on colleagues ──────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS "audit_log" (
    "id" text PRIMARY KEY NOT NULL,
    "user_id" text,
    "action" text NOT NULL,
    "entity_type" text NOT NULL,
    "entity_id" text NOT NULL,
    "changes" jsonb,
    "ip_address" text,
    "created_at" text NOT NULL,
    FOREIGN KEY ("user_id") REFERENCES "colleagues"("id") ON UPDATE no action ON DELETE no action
  )`,

  // ── Depend on humans ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS "pets" (
    "id" text PRIMARY KEY NOT NULL,
    "display_id" text NOT NULL UNIQUE,
    "human_id" text,
    "type" text NOT NULL DEFAULT 'dog',
    "name" text,
    "breed" text,
    "weight" real,
    "notes" text,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" text NOT NULL,
    "updated_at" text NOT NULL,
    FOREIGN KEY ("human_id") REFERENCES "humans"("id") ON UPDATE no action ON DELETE no action
  )`,
  `CREATE TABLE IF NOT EXISTS "lead_events" (
    "id" text PRIMARY KEY NOT NULL,
    "display_id" text NOT NULL UNIQUE,
    "human_id" text NOT NULL,
    "event_type" text NOT NULL,
    "notes" text,
    "metadata" jsonb,
    "created_by_user_id" text,
    "created_at" text NOT NULL,
    FOREIGN KEY ("human_id") REFERENCES "humans"("id") ON UPDATE no action ON DELETE no action,
    FOREIGN KEY ("created_by_user_id") REFERENCES "colleagues"("id") ON UPDATE no action ON DELETE no action
  )`,

  // ── Depend on accounts + config tables ────────────────────────────
  `CREATE TABLE IF NOT EXISTS "account_types" (
    "id" text PRIMARY KEY NOT NULL,
    "account_id" text NOT NULL REFERENCES "accounts"("id"),
    "type_id" text NOT NULL REFERENCES "account_types_config"("id"),
    "created_at" text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "account_humans" (
    "id" text PRIMARY KEY NOT NULL,
    "account_id" text NOT NULL REFERENCES "accounts"("id"),
    "human_id" text NOT NULL REFERENCES "humans"("id"),
    "label_id" text REFERENCES "account_human_labels_config"("id"),
    "created_at" text NOT NULL
  )`,

  // ── Depend on colleagues (front_sync_runs) ───────────────────────
  `CREATE TABLE IF NOT EXISTS "front_sync_runs" (
    "id" text PRIMARY KEY NOT NULL,
    "display_id" text NOT NULL UNIQUE,
    "status" text NOT NULL DEFAULT 'running',
    "started_at" text NOT NULL,
    "completed_at" text,
    "total_messages" integer NOT NULL DEFAULT 0,
    "imported" integer NOT NULL DEFAULT 0,
    "skipped" integer NOT NULL DEFAULT 0,
    "unmatched" integer NOT NULL DEFAULT 0,
    "error_count" integer NOT NULL DEFAULT 0,
    "error_messages" text,
    "unmatched_contacts" text,
    "linked_to_humans" integer NOT NULL DEFAULT 0,
    "linked_to_accounts" integer NOT NULL DEFAULT 0,
    "linked_to_route_signups" integer NOT NULL DEFAULT 0,
    "linked_to_bookings" integer NOT NULL DEFAULT 0,
    "linked_to_colleagues" integer NOT NULL DEFAULT 0,
    "linked_to_general_leads" integer NOT NULL DEFAULT 0,
    "initiated_by_colleague_id" text REFERENCES "colleagues"("id"),
    "created_at" text NOT NULL
  )`,

  // ── Depend on humans + colleagues + accounts + front_sync_runs + opportunities + general_leads ──
  `CREATE TABLE IF NOT EXISTS "activities" (
    "id" text PRIMARY KEY NOT NULL,
    "display_id" text NOT NULL UNIQUE,
    "type" text DEFAULT 'email' NOT NULL,
    "subject" text NOT NULL,
    "body" text,
    "notes" text,
    "activity_date" text NOT NULL,
    "human_id" text,
    "account_id" text REFERENCES "accounts"("id"),
    "route_signup_id" text,
    "website_booking_request_id" text,
    "opportunity_id" text REFERENCES "opportunities"("id"),
    "general_lead_id" text REFERENCES "general_leads"("id"),
    "gmail_id" text,
    "front_id" text,
    "front_conversation_id" text,
    "front_contact_handle" text,
    "direction" text,
    "sync_run_id" text REFERENCES "front_sync_runs"("id"),
    "sender_name" text,
    "colleague_id" text REFERENCES "colleagues"("id"),
    "created_at" text NOT NULL,
    "updated_at" text NOT NULL,
    FOREIGN KEY ("human_id") REFERENCES "humans"("id") ON UPDATE no action ON DELETE no action
  )`,

  // ── Depend on activities + geo_interests ──────────────────────────
  `CREATE TABLE IF NOT EXISTS "geo_interest_expressions" (
    "id" text PRIMARY KEY NOT NULL,
    "display_id" text NOT NULL UNIQUE,
    "human_id" text NOT NULL REFERENCES "humans"("id"),
    "geo_interest_id" text NOT NULL REFERENCES "geo_interests"("id"),
    "activity_id" text REFERENCES "activities"("id"),
    "notes" text,
    "created_at" text NOT NULL
  )`,

  // ── Depend on opportunities + humans + pets ───────────────────────
  `CREATE TABLE IF NOT EXISTS "opportunity_humans" (
    "id" text PRIMARY KEY NOT NULL,
    "opportunity_id" text NOT NULL REFERENCES "opportunities"("id"),
    "human_id" text NOT NULL REFERENCES "humans"("id"),
    "role_id" text REFERENCES "opportunity_human_roles_config"("id"),
    "created_at" text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "opportunity_pets" (
    "id" text PRIMARY KEY NOT NULL,
    "opportunity_id" text NOT NULL REFERENCES "opportunities"("id"),
    "pet_id" text NOT NULL REFERENCES "pets"("id"),
    "created_at" text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "activity_opportunities" (
    "id" text PRIMARY KEY NOT NULL,
    "activity_id" text NOT NULL REFERENCES "activities"("id"),
    "opportunity_id" text NOT NULL REFERENCES "opportunities"("id"),
    "created_at" text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "human_relationships" (
    "id" text PRIMARY KEY NOT NULL,
    "display_id" text NOT NULL UNIQUE,
    "human_id_1" text NOT NULL REFERENCES "humans"("id"),
    "human_id_2" text NOT NULL REFERENCES "humans"("id"),
    "label_id" text REFERENCES "human_relationship_labels_config"("id"),
    "created_at" text NOT NULL
  )`,

  // ── Route interests ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS "route_interests" (
    "id" text PRIMARY KEY NOT NULL,
    "display_id" text NOT NULL UNIQUE,
    "origin_city" text NOT NULL,
    "origin_country" text NOT NULL,
    "destination_city" text NOT NULL,
    "destination_country" text NOT NULL,
    "created_at" text NOT NULL,
    "updated_at" text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "route_interest_expressions" (
    "id" text PRIMARY KEY NOT NULL,
    "display_id" text NOT NULL UNIQUE,
    "human_id" text NOT NULL REFERENCES "humans"("id"),
    "route_interest_id" text NOT NULL REFERENCES "route_interests"("id"),
    "activity_id" text REFERENCES "activities"("id"),
    "frequency" text NOT NULL DEFAULT 'one_time',
    "travel_year" integer,
    "travel_month" integer,
    "travel_day" integer,
    "notes" text,
    "created_at" text NOT NULL
  )`,

  // ── Social IDs ──────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS "social_id_platforms_config" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "created_at" text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "social_ids" (
    "id" text PRIMARY KEY NOT NULL,
    "display_id" text NOT NULL UNIQUE,
    "handle" text NOT NULL,
    "platform_id" text REFERENCES "social_id_platforms_config"("id"),
    "human_id" text,
    "account_id" text,
    "general_lead_id" text,
    "website_booking_request_id" text,
    "route_signup_id" text,
    "created_at" text NOT NULL
  )`,

  // ── Additional label configs ────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS "account_email_labels_config" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL UNIQUE,
    "created_at" text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "account_phone_labels_config" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL UNIQUE,
    "created_at" text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "human_email_labels_config" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL UNIQUE,
    "created_at" text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "human_phone_labels_config" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL UNIQUE,
    "created_at" text NOT NULL
  )`,

  // ── Entity Next Actions ────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS "entity_next_actions" (
    "id" text PRIMARY KEY NOT NULL,
    "entity_type" text NOT NULL,
    "entity_id" text NOT NULL,
    "owner_id" text REFERENCES "colleagues"("id"),
    "description" text,
    "type" text,
    "start_date" text,
    "due_date" text,
    "completed_at" text,
    "cadence_note" text,
    "created_at" text DEFAULT now()::text NOT NULL,
    "updated_at" text DEFAULT now()::text NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "entity_next_actions_entity_type_entity_id_unique" ON "entity_next_actions" ("entity_type","entity_id")`,

  // ── Agreement types config ─────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS "agreement_types_config" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "created_at" text NOT NULL
  )`,

  // ── Agreements (depend on humans, accounts, agreement_types_config) ─
  `CREATE TABLE IF NOT EXISTS "agreements" (
    "id" text PRIMARY KEY NOT NULL,
    "display_id" text NOT NULL UNIQUE,
    "title" text NOT NULL,
    "type_id" text REFERENCES "agreement_types_config"("id"),
    "status" text DEFAULT 'open' NOT NULL,
    "activation_date" text,
    "notes" text,
    "human_id" text REFERENCES "humans"("id"),
    "account_id" text REFERENCES "accounts"("id"),
    "created_at" text NOT NULL,
    "updated_at" text NOT NULL
  )`,

  // ── Documents (generic, depend on colleagues) ───────────────────────
  `CREATE TABLE IF NOT EXISTS "documents" (
    "id" text PRIMARY KEY NOT NULL,
    "display_id" text NOT NULL UNIQUE,
    "key" text NOT NULL,
    "filename" text NOT NULL,
    "content_type" text NOT NULL,
    "size_bytes" integer NOT NULL,
    "entity_type" text NOT NULL,
    "entity_id" text NOT NULL,
    "uploaded_by" text REFERENCES "colleagues"("id"),
    "created_at" text NOT NULL
  )`,

  // ── Lead Scores (depend on general_leads) ──────────────────────────
  `CREATE TABLE IF NOT EXISTS "lead_scores" (
    "id" text PRIMARY KEY NOT NULL,
    "display_id" text NOT NULL UNIQUE,
    "general_lead_id" text REFERENCES "general_leads"("id"),
    "website_booking_request_id" text,
    "route_signup_id" text,
    "fit_matches_current_website_flight" boolean NOT NULL DEFAULT false,
    "fit_price_acknowledged_ok" boolean NOT NULL DEFAULT false,
    "intent_deposit_paid" boolean NOT NULL DEFAULT false,
    "intent_payment_details_sent" boolean NOT NULL DEFAULT false,
    "intent_requested_payment_details" boolean NOT NULL DEFAULT false,
    "intent_booking_submitted" boolean NOT NULL DEFAULT false,
    "intent_booking_started" boolean NOT NULL DEFAULT false,
    "intent_route_signup_submitted" boolean NOT NULL DEFAULT false,
    "engagement_responded_fast" boolean NOT NULL DEFAULT false,
    "engagement_responded_slow" boolean NOT NULL DEFAULT false,
    "negative_no_contact_method" boolean NOT NULL DEFAULT false,
    "negative_off_network_request" boolean NOT NULL DEFAULT false,
    "negative_price_objection" boolean NOT NULL DEFAULT false,
    "negative_ghosted_after_payment_sent" boolean NOT NULL DEFAULT false,
    "customer_has_flown" boolean NOT NULL DEFAULT false,
    "score_fit" integer NOT NULL DEFAULT 0,
    "score_intent" integer NOT NULL DEFAULT 0,
    "score_engagement" integer NOT NULL DEFAULT 0,
    "score_negative" integer NOT NULL DEFAULT 0,
    "score_total" integer NOT NULL DEFAULT 0,
    "score_updated_at" text,
    "created_at" text NOT NULL,
    "updated_at" text NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "lead_scores_general_lead_id_unique" ON "lead_scores" ("general_lead_id")`,
  `CREATE INDEX IF NOT EXISTS "lead_scores_website_booking_request_id_idx" ON "lead_scores" ("website_booking_request_id")`,
  `CREATE INDEX IF NOT EXISTS "lead_scores_route_signup_id_idx" ON "lead_scores" ("route_signup_id")`,
  `CREATE INDEX IF NOT EXISTS "lead_scores_score_total_idx" ON "lead_scores" ("score_total")`,

  // ── Indexes ───────────────────────────────────────────────────────
  `CREATE UNIQUE INDEX IF NOT EXISTS "colleagues_email_unique" ON "colleagues" ("email")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "colleagues_google_id_unique" ON "colleagues" ("google_id")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "geo_interests_city_country_unique" ON "geo_interests" ("city", "country")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "account_types_config_name_unique" ON "account_types_config" ("name")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "account_human_labels_config_name_unique" ON "account_human_labels_config" ("name")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "email_labels_config_name_unique" ON "email_labels_config" ("name")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "phone_labels_config_name_unique" ON "phone_labels_config" ("name")`,
  `CREATE INDEX IF NOT EXISTS "emails_human_id_idx" ON "emails" ("human_id")`,
  `CREATE INDEX IF NOT EXISTS "emails_account_id_idx" ON "emails" ("account_id")`,
  `CREATE INDEX IF NOT EXISTS "emails_general_lead_id_idx" ON "emails" ("general_lead_id")`,
  `CREATE INDEX IF NOT EXISTS "emails_website_booking_request_id_idx" ON "emails" ("website_booking_request_id")`,
  `CREATE INDEX IF NOT EXISTS "emails_route_signup_id_idx" ON "emails" ("route_signup_id")`,
  `CREATE INDEX IF NOT EXISTS "phones_human_id_idx" ON "phones" ("human_id")`,
  `CREATE INDEX IF NOT EXISTS "phones_account_id_idx" ON "phones" ("account_id")`,
  `CREATE INDEX IF NOT EXISTS "phones_general_lead_id_idx" ON "phones" ("general_lead_id")`,
  `CREATE INDEX IF NOT EXISTS "phones_website_booking_request_id_idx" ON "phones" ("website_booking_request_id")`,
  `CREATE INDEX IF NOT EXISTS "phones_route_signup_id_idx" ON "phones" ("route_signup_id")`,
  `CREATE INDEX IF NOT EXISTS "error_log_request_id_idx" ON "error_log" ("request_id")`,
  `CREATE INDEX IF NOT EXISTS "error_log_code_idx" ON "error_log" ("code")`,
  `CREATE INDEX IF NOT EXISTS "error_log_created_at_idx" ON "error_log" ("created_at")`,
  `CREATE INDEX IF NOT EXISTS "geo_interest_expressions_human_id_idx" ON "geo_interest_expressions" ("human_id")`,
  `CREATE INDEX IF NOT EXISTS "geo_interest_expressions_geo_interest_id_idx" ON "geo_interest_expressions" ("geo_interest_id")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "route_interests_origin_dest_unique" ON "route_interests" ("origin_city", "origin_country", "destination_city", "destination_country")`,
  `CREATE INDEX IF NOT EXISTS "route_interest_expressions_human_id_idx" ON "route_interest_expressions" ("human_id")`,
  `CREATE INDEX IF NOT EXISTS "route_interest_expressions_route_interest_id_idx" ON "route_interest_expressions" ("route_interest_id")`,
  `CREATE INDEX IF NOT EXISTS "social_ids_human_id_idx" ON "social_ids" ("human_id")`,
  `CREATE INDEX IF NOT EXISTS "social_ids_account_id_idx" ON "social_ids" ("account_id")`,
  `CREATE INDEX IF NOT EXISTS "social_ids_general_lead_id_idx" ON "social_ids" ("general_lead_id")`,
  `CREATE INDEX IF NOT EXISTS "social_ids_website_booking_request_id_idx" ON "social_ids" ("website_booking_request_id")`,
  `CREATE INDEX IF NOT EXISTS "social_ids_route_signup_id_idx" ON "social_ids" ("route_signup_id")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "error_log_display_id_idx" ON "error_log" ("display_id")`,
  `CREATE INDEX IF NOT EXISTS "error_log_resolution_status_idx" ON "error_log" ("resolution_status")`,
  `CREATE INDEX IF NOT EXISTS "opportunity_humans_opportunity_id_idx" ON "opportunity_humans" ("opportunity_id")`,
  `CREATE INDEX IF NOT EXISTS "opportunity_humans_human_id_idx" ON "opportunity_humans" ("human_id")`,
  `CREATE INDEX IF NOT EXISTS "opportunity_pets_opportunity_id_idx" ON "opportunity_pets" ("opportunity_id")`,
  `CREATE INDEX IF NOT EXISTS "opportunity_pets_pet_id_idx" ON "opportunity_pets" ("pet_id")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "activity_opportunities_activity_opportunity_idx" ON "activity_opportunities" ("activity_id","opportunity_id")`,
  `CREATE INDEX IF NOT EXISTS "activity_opportunities_activity_id_idx" ON "activity_opportunities" ("activity_id")`,
  `CREATE INDEX IF NOT EXISTS "activity_opportunities_opportunity_id_idx" ON "activity_opportunities" ("opportunity_id")`,
  `CREATE INDEX IF NOT EXISTS "websites_human_id_idx" ON "websites" ("human_id")`,
  `CREATE INDEX IF NOT EXISTS "websites_account_id_idx" ON "websites" ("account_id")`,
  `CREATE INDEX IF NOT EXISTS "referral_codes_human_id_idx" ON "referral_codes" ("human_id")`,
  `CREATE INDEX IF NOT EXISTS "referral_codes_account_id_idx" ON "referral_codes" ("account_id")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "agreement_types_config_name_unique" ON "agreement_types_config" ("name")`,
  `CREATE INDEX IF NOT EXISTS "agreements_human_id_idx" ON "agreements" ("human_id")`,
  `CREATE INDEX IF NOT EXISTS "agreements_account_id_idx" ON "agreements" ("account_id")`,
  `CREATE INDEX IF NOT EXISTS "documents_entity_type_entity_id_idx" ON "documents" ("entity_type", "entity_id")`,
  `CREATE INDEX IF NOT EXISTS "documents_key_idx" ON "documents" ("key")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "activities_front_id_unique" ON "activities" ("front_id") WHERE "front_id" IS NOT NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "general_leads_front_conversation_id_unique" ON "general_leads" ("front_conversation_id") WHERE "front_conversation_id" IS NOT NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "loss_reasons_config_name_unique" ON "loss_reasons_config" ("name")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "emails_email_unique" ON "emails" ("email")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "phones_phone_number_unique" ON "phones" ("phone_number")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "social_ids_platform_handle_unique" ON "social_ids" (COALESCE("platform_id", '__no_platform__'), "handle")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "websites_url_unique" ON "websites" ("url")`,
];

// All tables for TRUNCATE cleanup
const ALL_TABLES = [
  "documents",
  "agreements",
  "entity_next_actions",
  "opportunity_humans",
  "opportunity_pets",
  "activity_opportunities",
  "human_relationships",
  "route_interest_expressions",
  "geo_interest_expressions",
  "social_ids",
  "activities",
  "front_sync_runs",
  "account_humans",
  "account_types",
  "lead_events",
  "pets",
  "human_route_signups",
  "human_website_booking_requests",
  "phones",
  "human_types",
  "emails",
  "audit_log",
  "error_log",
  "lead_scores",
  "opportunities",
  "general_leads",
  "websites",
  "referral_codes",
  "route_interests",
  "geo_interests",
  "social_id_platforms_config",
  "account_email_labels_config",
  "account_phone_labels_config",
  "human_email_labels_config",
  "human_phone_labels_config",
  "account_human_labels_config",
  "account_types_config",
  "lead_sources_config",
  "lead_channels_config",
  "agreement_types_config",
  "email_labels_config",
  "phone_labels_config",
  "loss_reasons_config",
  "display_id_counters",
  "opportunity_human_roles_config",
  "opportunity_stage_cadence_config",
  "human_relationship_labels_config",
  "accounts",
  "lead_sources",
  "humans",
  "colleagues",
];

const pglite = new PGlite();
const db = drizzle(pglite, { schema });

// Export the DB typed as PostgresJsDatabase for service function compatibility.
// The PGlite Drizzle instance is structurally compatible.
export function getTestDb() {
  return db as unknown as PostgresJsDatabase<typeof schema>;
}

beforeAll(async () => {
  for (const stmt of MIGRATION_STATEMENTS) {
    await pglite.exec(stmt);
  }
});

afterEach(async () => {
  await pglite.exec(`TRUNCATE ${ALL_TABLES.map((t) => `"${t}"`).join(", ")} CASCADE`);
});
