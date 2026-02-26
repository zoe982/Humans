CREATE TABLE `lead_scores` (
  `id` text PRIMARY KEY NOT NULL,
  `display_id` text NOT NULL,
  `general_lead_id` text REFERENCES `general_leads`(`id`),
  `website_booking_request_id` text,
  `route_signup_id` text,
  `fit_matches_current_website_flight` integer NOT NULL DEFAULT 0,
  `fit_price_acknowledged_ok` integer NOT NULL DEFAULT 0,
  `intent_deposit_paid` integer NOT NULL DEFAULT 0,
  `intent_payment_details_sent` integer NOT NULL DEFAULT 0,
  `intent_requested_payment_details` integer NOT NULL DEFAULT 0,
  `intent_booking_submitted` integer NOT NULL DEFAULT 0,
  `intent_booking_started` integer NOT NULL DEFAULT 0,
  `intent_route_signup_submitted` integer NOT NULL DEFAULT 0,
  `engagement_responded_fast` integer NOT NULL DEFAULT 0,
  `engagement_responded_slow` integer NOT NULL DEFAULT 0,
  `negative_no_contact_method` integer NOT NULL DEFAULT 0,
  `negative_off_network_request` integer NOT NULL DEFAULT 0,
  `negative_price_objection` integer NOT NULL DEFAULT 0,
  `negative_ghosted_after_payment_sent` integer NOT NULL DEFAULT 0,
  `customer_has_flown` integer NOT NULL DEFAULT 0,
  `score_fit` integer NOT NULL DEFAULT 0,
  `score_intent` integer NOT NULL DEFAULT 0,
  `score_engagement` integer NOT NULL DEFAULT 0,
  `score_negative` integer NOT NULL DEFAULT 0,
  `score_total` integer NOT NULL DEFAULT 0,
  `score_updated_at` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);

CREATE UNIQUE INDEX `lead_scores_display_id_unique` ON `lead_scores` (`display_id`);
CREATE UNIQUE INDEX `lead_scores_general_lead_id_unique` ON `lead_scores` (`general_lead_id`);
CREATE INDEX `lead_scores_website_booking_request_id_idx` ON `lead_scores` (`website_booking_request_id`);
CREATE INDEX `lead_scores_route_signup_id_idx` ON `lead_scores` (`route_signup_id`);
CREATE INDEX `lead_scores_score_total_idx` ON `lead_scores` (`score_total`);
