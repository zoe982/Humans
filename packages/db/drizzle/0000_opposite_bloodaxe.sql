CREATE TABLE "account_email_labels_config" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "account_email_labels_config_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "account_human_labels_config" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "account_human_labels_config_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "account_humans" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"human_id" text NOT NULL,
	"label_id" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_phone_labels_config" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "account_phone_labels_config_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "account_types" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"type_id" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_types_config" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "account_types_config_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"display_id" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "accounts_display_id_unique" UNIQUE("display_id")
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" text PRIMARY KEY NOT NULL,
	"display_id" text NOT NULL,
	"type" text DEFAULT 'email' NOT NULL,
	"subject" text NOT NULL,
	"body" text,
	"notes" text,
	"activity_date" text NOT NULL,
	"human_id" text,
	"account_id" text,
	"route_signup_id" text,
	"website_booking_request_id" text,
	"opportunity_id" text,
	"general_lead_id" text,
	"gmail_id" text,
	"front_id" text,
	"front_conversation_id" text,
	"front_contact_handle" text,
	"direction" text,
	"sync_run_id" text,
	"sender_name" text,
	"colleague_id" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "activities_display_id_unique" UNIQUE("display_id")
);
--> statement-breakpoint
CREATE TABLE "activity_opportunities" (
	"id" text PRIMARY KEY NOT NULL,
	"activity_id" text NOT NULL,
	"opportunity_id" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agreement_types_config" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "agreement_types_config_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "agreements" (
	"id" text PRIMARY KEY NOT NULL,
	"display_id" text NOT NULL,
	"title" text NOT NULL,
	"type_id" text,
	"status" text DEFAULT 'open' NOT NULL,
	"activation_date" text,
	"notes" text,
	"human_id" text,
	"account_id" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "agreements_display_id_unique" UNIQUE("display_id")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"changes" jsonb,
	"ip_address" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "colleagues" (
	"id" text PRIMARY KEY NOT NULL,
	"display_id" text NOT NULL,
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
	"updated_at" text NOT NULL,
	CONSTRAINT "colleagues_display_id_unique" UNIQUE("display_id"),
	CONSTRAINT "colleagues_email_unique" UNIQUE("email"),
	CONSTRAINT "colleagues_google_id_unique" UNIQUE("google_id")
);
--> statement-breakpoint
CREATE TABLE "display_id_counters" (
	"prefix" text PRIMARY KEY NOT NULL,
	"counter" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"display_id" text NOT NULL,
	"key" text NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"uploaded_by" text,
	"created_at" text NOT NULL,
	CONSTRAINT "documents_display_id_unique" UNIQUE("display_id")
);
--> statement-breakpoint
CREATE TABLE "email_labels_config" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "email_labels_config_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "emails" (
	"id" text PRIMARY KEY NOT NULL,
	"display_id" text NOT NULL,
	"human_id" text,
	"account_id" text,
	"general_lead_id" text,
	"website_booking_request_id" text,
	"route_signup_id" text,
	"email" text NOT NULL,
	"label_id" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "emails_display_id_unique" UNIQUE("display_id")
);
--> statement-breakpoint
CREATE TABLE "entity_next_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"owner_id" text,
	"description" text,
	"type" text,
	"start_date" text,
	"due_date" text,
	"completed_at" text,
	"cadence_note" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "error_log" (
	"id" text PRIMARY KEY NOT NULL,
	"display_id" text NOT NULL,
	"request_id" text NOT NULL,
	"code" text NOT NULL,
	"message" text NOT NULL,
	"status" integer NOT NULL,
	"resolution_status" text DEFAULT 'open' NOT NULL,
	"method" text,
	"path" text,
	"user_id" text,
	"details" jsonb,
	"stack" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "front_sync_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"display_id" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"started_at" text NOT NULL,
	"completed_at" text,
	"total_messages" integer DEFAULT 0 NOT NULL,
	"imported" integer DEFAULT 0 NOT NULL,
	"skipped" integer DEFAULT 0 NOT NULL,
	"unmatched" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"error_messages" text,
	"unmatched_contacts" text,
	"linked_to_humans" integer DEFAULT 0 NOT NULL,
	"linked_to_accounts" integer DEFAULT 0 NOT NULL,
	"linked_to_route_signups" integer DEFAULT 0 NOT NULL,
	"linked_to_bookings" integer DEFAULT 0 NOT NULL,
	"linked_to_colleagues" integer DEFAULT 0 NOT NULL,
	"linked_to_general_leads" integer DEFAULT 0 NOT NULL,
	"initiated_by_colleague_id" text,
	"created_at" text NOT NULL,
	CONSTRAINT "front_sync_runs_display_id_unique" UNIQUE("display_id")
);
--> statement-breakpoint
CREATE TABLE "general_leads" (
	"id" text PRIMARY KEY NOT NULL,
	"display_id" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"first_name" text NOT NULL,
	"middle_name" text,
	"last_name" text NOT NULL,
	"notes" text,
	"reject_reason" text,
	"loss_reason" text,
	"converted_human_id" text,
	"owner_id" text,
	"front_conversation_id" text,
	"source" text,
	"channel" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "general_leads_display_id_unique" UNIQUE("display_id")
);
--> statement-breakpoint
CREATE TABLE "geo_interest_expressions" (
	"id" text PRIMARY KEY NOT NULL,
	"display_id" text NOT NULL,
	"human_id" text NOT NULL,
	"geo_interest_id" text NOT NULL,
	"activity_id" text,
	"notes" text,
	"created_at" text NOT NULL,
	CONSTRAINT "geo_interest_expressions_display_id_unique" UNIQUE("display_id")
);
--> statement-breakpoint
CREATE TABLE "geo_interests" (
	"id" text PRIMARY KEY NOT NULL,
	"display_id" text NOT NULL,
	"city" text NOT NULL,
	"country" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "geo_interests_display_id_unique" UNIQUE("display_id")
);
--> statement-breakpoint
CREATE TABLE "human_email_labels_config" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "human_email_labels_config_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "human_phone_labels_config" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "human_phone_labels_config_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "human_relationship_labels_config" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "human_relationship_labels_config_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "human_relationships" (
	"id" text PRIMARY KEY NOT NULL,
	"display_id" text NOT NULL,
	"human_id_1" text NOT NULL,
	"human_id_2" text NOT NULL,
	"label_id" text,
	"created_at" text NOT NULL,
	CONSTRAINT "human_relationships_display_id_unique" UNIQUE("display_id")
);
--> statement-breakpoint
CREATE TABLE "human_route_signups" (
	"id" text PRIMARY KEY NOT NULL,
	"human_id" text NOT NULL,
	"route_signup_id" text NOT NULL,
	"linked_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "human_types" (
	"id" text PRIMARY KEY NOT NULL,
	"human_id" text NOT NULL,
	"type" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "human_website_booking_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"human_id" text NOT NULL,
	"website_booking_request_id" text NOT NULL,
	"opportunity_id" text,
	"linked_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "humans" (
	"id" text PRIMARY KEY NOT NULL,
	"display_id" text NOT NULL,
	"first_name" text NOT NULL,
	"middle_name" text,
	"last_name" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "humans_display_id_unique" UNIQUE("display_id")
);
--> statement-breakpoint
CREATE TABLE "lead_channels_config" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "lead_channels_config_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "lead_events" (
	"id" text PRIMARY KEY NOT NULL,
	"display_id" text NOT NULL,
	"human_id" text NOT NULL,
	"event_type" text NOT NULL,
	"notes" text,
	"metadata" jsonb,
	"created_by_user_id" text,
	"created_at" text NOT NULL,
	CONSTRAINT "lead_events_display_id_unique" UNIQUE("display_id")
);
--> statement-breakpoint
CREATE TABLE "lead_scores" (
	"id" text PRIMARY KEY NOT NULL,
	"display_id" text NOT NULL,
	"general_lead_id" text,
	"website_booking_request_id" text,
	"route_signup_id" text,
	"fit_matches_current_website_flight" boolean DEFAULT false NOT NULL,
	"fit_price_acknowledged_ok" boolean DEFAULT false NOT NULL,
	"intent_deposit_paid" boolean DEFAULT false NOT NULL,
	"intent_payment_details_sent" boolean DEFAULT false NOT NULL,
	"intent_requested_payment_details" boolean DEFAULT false NOT NULL,
	"intent_booking_submitted" boolean DEFAULT false NOT NULL,
	"intent_booking_started" boolean DEFAULT false NOT NULL,
	"intent_route_signup_submitted" boolean DEFAULT false NOT NULL,
	"engagement_responded_fast" boolean DEFAULT false NOT NULL,
	"engagement_responded_slow" boolean DEFAULT false NOT NULL,
	"negative_no_contact_method" boolean DEFAULT false NOT NULL,
	"negative_off_network_request" boolean DEFAULT false NOT NULL,
	"negative_price_objection" boolean DEFAULT false NOT NULL,
	"negative_ghosted_after_payment_sent" boolean DEFAULT false NOT NULL,
	"customer_has_flown" boolean DEFAULT false NOT NULL,
	"score_fit" integer DEFAULT 0 NOT NULL,
	"score_intent" integer DEFAULT 0 NOT NULL,
	"score_engagement" integer DEFAULT 0 NOT NULL,
	"score_negative" integer DEFAULT 0 NOT NULL,
	"score_total" integer DEFAULT 0 NOT NULL,
	"score_updated_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "lead_scores_display_id_unique" UNIQUE("display_id")
);
--> statement-breakpoint
CREATE TABLE "lead_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"display_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "lead_sources_display_id_unique" UNIQUE("display_id")
);
--> statement-breakpoint
CREATE TABLE "lead_sources_config" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "lead_sources_config_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "loss_reasons_config" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "loss_reasons_config_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" text PRIMARY KEY NOT NULL,
	"display_id" text NOT NULL,
	"stage" text DEFAULT 'open' NOT NULL,
	"seats_requested" integer DEFAULT 1 NOT NULL,
	"passenger_seats" integer DEFAULT 1 NOT NULL,
	"pet_seats" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"loss_reason" text,
	"owner_id" text,
	"next_action_owner_id" text,
	"next_action_description" text,
	"next_action_type" text,
	"next_action_start_date" text,
	"next_action_due_date" text,
	"next_action_completed_at" text,
	"next_action_cadence_note" text,
	"flight_id" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "opportunities_display_id_unique" UNIQUE("display_id")
);
--> statement-breakpoint
CREATE TABLE "opportunity_human_roles_config" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "opportunity_human_roles_config_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "opportunity_humans" (
	"id" text PRIMARY KEY NOT NULL,
	"opportunity_id" text NOT NULL,
	"human_id" text NOT NULL,
	"role_id" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_pets" (
	"id" text PRIMARY KEY NOT NULL,
	"opportunity_id" text NOT NULL,
	"pet_id" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_stage_cadence_config" (
	"id" text PRIMARY KEY NOT NULL,
	"stage" text NOT NULL,
	"cadence_hours" integer NOT NULL,
	"display_text" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "opportunity_stage_cadence_config_stage_unique" UNIQUE("stage")
);
--> statement-breakpoint
CREATE TABLE "pets" (
	"id" text PRIMARY KEY NOT NULL,
	"display_id" text NOT NULL,
	"human_id" text,
	"type" text DEFAULT 'dog' NOT NULL,
	"name" text,
	"breed" text,
	"weight" real,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "pets_display_id_unique" UNIQUE("display_id")
);
--> statement-breakpoint
CREATE TABLE "phone_labels_config" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "phone_labels_config_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "phones" (
	"id" text PRIMARY KEY NOT NULL,
	"display_id" text NOT NULL,
	"human_id" text,
	"account_id" text,
	"general_lead_id" text,
	"website_booking_request_id" text,
	"route_signup_id" text,
	"phone_number" text NOT NULL,
	"label_id" text,
	"has_whatsapp" boolean DEFAULT false NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "phones_display_id_unique" UNIQUE("display_id")
);
--> statement-breakpoint
CREATE TABLE "route_interest_expressions" (
	"id" text PRIMARY KEY NOT NULL,
	"display_id" text NOT NULL,
	"human_id" text NOT NULL,
	"route_interest_id" text NOT NULL,
	"activity_id" text,
	"frequency" text DEFAULT 'one_time' NOT NULL,
	"travel_year" integer,
	"travel_month" integer,
	"travel_day" integer,
	"notes" text,
	"created_at" text NOT NULL,
	CONSTRAINT "route_interest_expressions_display_id_unique" UNIQUE("display_id")
);
--> statement-breakpoint
CREATE TABLE "route_interests" (
	"id" text PRIMARY KEY NOT NULL,
	"display_id" text NOT NULL,
	"origin_city" text NOT NULL,
	"origin_country" text NOT NULL,
	"destination_city" text NOT NULL,
	"destination_country" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "route_interests_display_id_unique" UNIQUE("display_id")
);
--> statement-breakpoint
CREATE TABLE "social_id_platforms_config" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_ids" (
	"id" text PRIMARY KEY NOT NULL,
	"display_id" text NOT NULL,
	"handle" text NOT NULL,
	"platform_id" text,
	"human_id" text,
	"account_id" text,
	"general_lead_id" text,
	"website_booking_request_id" text,
	"route_signup_id" text,
	"created_at" text NOT NULL,
	CONSTRAINT "social_ids_display_id_unique" UNIQUE("display_id")
);
--> statement-breakpoint
CREATE TABLE "websites" (
	"id" text PRIMARY KEY NOT NULL,
	"display_id" text NOT NULL,
	"url" text NOT NULL,
	"human_id" text,
	"account_id" text,
	"created_at" text NOT NULL,
	CONSTRAINT "websites_display_id_unique" UNIQUE("display_id")
);
--> statement-breakpoint
ALTER TABLE "account_humans" ADD CONSTRAINT "account_humans_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_humans" ADD CONSTRAINT "account_humans_human_id_humans_id_fk" FOREIGN KEY ("human_id") REFERENCES "public"."humans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_humans" ADD CONSTRAINT "account_humans_label_id_account_human_labels_config_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."account_human_labels_config"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_types" ADD CONSTRAINT "account_types_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_types" ADD CONSTRAINT "account_types_type_id_account_types_config_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."account_types_config"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_human_id_humans_id_fk" FOREIGN KEY ("human_id") REFERENCES "public"."humans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_general_lead_id_general_leads_id_fk" FOREIGN KEY ("general_lead_id") REFERENCES "public"."general_leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_sync_run_id_front_sync_runs_id_fk" FOREIGN KEY ("sync_run_id") REFERENCES "public"."front_sync_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_colleague_id_colleagues_id_fk" FOREIGN KEY ("colleague_id") REFERENCES "public"."colleagues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_opportunities" ADD CONSTRAINT "activity_opportunities_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_opportunities" ADD CONSTRAINT "activity_opportunities_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_colleagues_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."colleagues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_next_actions" ADD CONSTRAINT "entity_next_actions_owner_id_colleagues_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."colleagues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "front_sync_runs" ADD CONSTRAINT "front_sync_runs_initiated_by_colleague_id_colleagues_id_fk" FOREIGN KEY ("initiated_by_colleague_id") REFERENCES "public"."colleagues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "general_leads" ADD CONSTRAINT "general_leads_converted_human_id_humans_id_fk" FOREIGN KEY ("converted_human_id") REFERENCES "public"."humans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "general_leads" ADD CONSTRAINT "general_leads_owner_id_colleagues_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."colleagues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_interest_expressions" ADD CONSTRAINT "geo_interest_expressions_human_id_humans_id_fk" FOREIGN KEY ("human_id") REFERENCES "public"."humans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_interest_expressions" ADD CONSTRAINT "geo_interest_expressions_geo_interest_id_geo_interests_id_fk" FOREIGN KEY ("geo_interest_id") REFERENCES "public"."geo_interests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_interest_expressions" ADD CONSTRAINT "geo_interest_expressions_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "human_relationships" ADD CONSTRAINT "human_relationships_human_id_1_humans_id_fk" FOREIGN KEY ("human_id_1") REFERENCES "public"."humans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "human_relationships" ADD CONSTRAINT "human_relationships_human_id_2_humans_id_fk" FOREIGN KEY ("human_id_2") REFERENCES "public"."humans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "human_relationships" ADD CONSTRAINT "human_relationships_label_id_human_relationship_labels_config_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."human_relationship_labels_config"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "human_route_signups" ADD CONSTRAINT "human_route_signups_human_id_humans_id_fk" FOREIGN KEY ("human_id") REFERENCES "public"."humans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "human_types" ADD CONSTRAINT "human_types_human_id_humans_id_fk" FOREIGN KEY ("human_id") REFERENCES "public"."humans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "human_website_booking_requests" ADD CONSTRAINT "human_website_booking_requests_human_id_humans_id_fk" FOREIGN KEY ("human_id") REFERENCES "public"."humans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "human_website_booking_requests" ADD CONSTRAINT "human_website_booking_requests_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_human_id_humans_id_fk" FOREIGN KEY ("human_id") REFERENCES "public"."humans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_created_by_user_id_colleagues_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."colleagues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_scores" ADD CONSTRAINT "lead_scores_general_lead_id_general_leads_id_fk" FOREIGN KEY ("general_lead_id") REFERENCES "public"."general_leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_owner_id_colleagues_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."colleagues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_next_action_owner_id_colleagues_id_fk" FOREIGN KEY ("next_action_owner_id") REFERENCES "public"."colleagues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_humans" ADD CONSTRAINT "opportunity_humans_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_humans" ADD CONSTRAINT "opportunity_humans_human_id_humans_id_fk" FOREIGN KEY ("human_id") REFERENCES "public"."humans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_humans" ADD CONSTRAINT "opportunity_humans_role_id_opportunity_human_roles_config_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."opportunity_human_roles_config"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_pets" ADD CONSTRAINT "opportunity_pets_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_pets" ADD CONSTRAINT "opportunity_pets_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pets" ADD CONSTRAINT "pets_human_id_humans_id_fk" FOREIGN KEY ("human_id") REFERENCES "public"."humans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_interest_expressions" ADD CONSTRAINT "route_interest_expressions_human_id_humans_id_fk" FOREIGN KEY ("human_id") REFERENCES "public"."humans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_interest_expressions" ADD CONSTRAINT "route_interest_expressions_route_interest_id_route_interests_id_fk" FOREIGN KEY ("route_interest_id") REFERENCES "public"."route_interests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_interest_expressions" ADD CONSTRAINT "route_interest_expressions_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_ids" ADD CONSTRAINT "social_ids_platform_id_social_id_platforms_config_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."social_id_platforms_config"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "activities_front_id_unique" ON "activities" USING btree ("front_id") WHERE "activities"."front_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "activity_opportunities_activity_opportunity_idx" ON "activity_opportunities" USING btree ("activity_id","opportunity_id");--> statement-breakpoint
CREATE INDEX "activity_opportunities_activity_id_idx" ON "activity_opportunities" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "activity_opportunities_opportunity_id_idx" ON "activity_opportunities" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "agreements_human_id_idx" ON "agreements" USING btree ("human_id");--> statement-breakpoint
CREATE INDEX "agreements_account_id_idx" ON "agreements" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "documents_entity_idx" ON "documents" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "documents_key_idx" ON "documents" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "emails_email_unique" ON "emails" USING btree ("email");--> statement-breakpoint
CREATE INDEX "emails_human_id_idx" ON "emails" USING btree ("human_id");--> statement-breakpoint
CREATE INDEX "emails_account_id_idx" ON "emails" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "emails_general_lead_id_idx" ON "emails" USING btree ("general_lead_id");--> statement-breakpoint
CREATE INDEX "emails_website_booking_request_id_idx" ON "emails" USING btree ("website_booking_request_id");--> statement-breakpoint
CREATE INDEX "emails_route_signup_id_idx" ON "emails" USING btree ("route_signup_id");--> statement-breakpoint
CREATE UNIQUE INDEX "entity_next_actions_entity_type_entity_id_unique" ON "entity_next_actions" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "error_log_display_id_idx" ON "error_log" USING btree ("display_id");--> statement-breakpoint
CREATE INDEX "error_log_request_id_idx" ON "error_log" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "error_log_code_idx" ON "error_log" USING btree ("code");--> statement-breakpoint
CREATE INDEX "error_log_created_at_idx" ON "error_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "error_log_resolution_status_idx" ON "error_log" USING btree ("resolution_status");--> statement-breakpoint
CREATE UNIQUE INDEX "general_leads_front_conversation_id_unique" ON "general_leads" USING btree ("front_conversation_id") WHERE front_conversation_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "geo_interest_expressions_human_id_idx" ON "geo_interest_expressions" USING btree ("human_id");--> statement-breakpoint
CREATE INDEX "geo_interest_expressions_geo_interest_id_idx" ON "geo_interest_expressions" USING btree ("geo_interest_id");--> statement-breakpoint
CREATE INDEX "geo_interest_expressions_activity_id_idx" ON "geo_interest_expressions" USING btree ("activity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "geo_interests_city_country_unique" ON "geo_interests" USING btree ("city","country");--> statement-breakpoint
CREATE UNIQUE INDEX "human_route_signups_route_signup_id_unique" ON "human_route_signups" USING btree ("route_signup_id");--> statement-breakpoint
CREATE UNIQUE INDEX "human_website_booking_requests_wbr_id_unique" ON "human_website_booking_requests" USING btree ("website_booking_request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lead_scores_general_lead_id_unique" ON "lead_scores" USING btree ("general_lead_id");--> statement-breakpoint
CREATE INDEX "lead_scores_website_booking_request_id_idx" ON "lead_scores" USING btree ("website_booking_request_id");--> statement-breakpoint
CREATE INDEX "lead_scores_route_signup_id_idx" ON "lead_scores" USING btree ("route_signup_id");--> statement-breakpoint
CREATE INDEX "lead_scores_score_total_idx" ON "lead_scores" USING btree ("score_total");--> statement-breakpoint
CREATE INDEX "opportunity_humans_opportunity_id_idx" ON "opportunity_humans" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "opportunity_humans_human_id_idx" ON "opportunity_humans" USING btree ("human_id");--> statement-breakpoint
CREATE INDEX "opportunity_pets_opportunity_id_idx" ON "opportunity_pets" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "opportunity_pets_pet_id_idx" ON "opportunity_pets" USING btree ("pet_id");--> statement-breakpoint
CREATE UNIQUE INDEX "phones_phone_number_unique" ON "phones" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "phones_human_id_idx" ON "phones" USING btree ("human_id");--> statement-breakpoint
CREATE INDEX "phones_account_id_idx" ON "phones" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "phones_general_lead_id_idx" ON "phones" USING btree ("general_lead_id");--> statement-breakpoint
CREATE INDEX "phones_website_booking_request_id_idx" ON "phones" USING btree ("website_booking_request_id");--> statement-breakpoint
CREATE INDEX "phones_route_signup_id_idx" ON "phones" USING btree ("route_signup_id");--> statement-breakpoint
CREATE INDEX "route_interest_expressions_human_id_idx" ON "route_interest_expressions" USING btree ("human_id");--> statement-breakpoint
CREATE INDEX "route_interest_expressions_route_interest_id_idx" ON "route_interest_expressions" USING btree ("route_interest_id");--> statement-breakpoint
CREATE INDEX "route_interest_expressions_activity_id_idx" ON "route_interest_expressions" USING btree ("activity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "route_interests_origin_dest_unique" ON "route_interests" USING btree ("origin_city","origin_country","destination_city","destination_country");--> statement-breakpoint
CREATE INDEX "social_ids_human_id_idx" ON "social_ids" USING btree ("human_id");--> statement-breakpoint
CREATE INDEX "social_ids_account_id_idx" ON "social_ids" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "social_ids_general_lead_id_idx" ON "social_ids" USING btree ("general_lead_id");--> statement-breakpoint
CREATE INDEX "social_ids_website_booking_request_id_idx" ON "social_ids" USING btree ("website_booking_request_id");--> statement-breakpoint
CREATE INDEX "social_ids_route_signup_id_idx" ON "social_ids" USING btree ("route_signup_id");--> statement-breakpoint
CREATE UNIQUE INDEX "websites_url_unique" ON "websites" USING btree ("url");--> statement-breakpoint
CREATE INDEX "websites_human_id_idx" ON "websites" USING btree ("human_id");--> statement-breakpoint
CREATE INDEX "websites_account_id_idx" ON "websites" USING btree ("account_id");