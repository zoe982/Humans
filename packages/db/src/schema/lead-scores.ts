import { integer, sqliteTable, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { generalLeads } from "./general-leads";

export const leadScores = sqliteTable(
  "lead_scores",
  {
    id: text("id").primaryKey(),
    displayId: text("display_id").notNull().unique(),

    // Parent FK — exactly one non-null (enforced in service layer)
    generalLeadId: text("general_lead_id").references(() => generalLeads.id),
    websiteBookingRequestId: text("website_booking_request_id"), // Supabase — no FK
    routeSignupId: text("route_signup_id"), // Supabase — no FK

    // Fit flags
    fitMatchesCurrentWebsiteFlight: integer("fit_matches_current_website_flight", { mode: "boolean" }).notNull().default(false),
    fitPriceAcknowledgedOk: integer("fit_price_acknowledged_ok", { mode: "boolean" }).notNull().default(false),

    // Intent flags
    intentDepositPaid: integer("intent_deposit_paid", { mode: "boolean" }).notNull().default(false),
    intentPaymentDetailsSent: integer("intent_payment_details_sent", { mode: "boolean" }).notNull().default(false),
    intentRequestedPaymentDetails: integer("intent_requested_payment_details", { mode: "boolean" }).notNull().default(false),
    intentBookingSubmitted: integer("intent_booking_submitted", { mode: "boolean" }).notNull().default(false),
    intentBookingStarted: integer("intent_booking_started", { mode: "boolean" }).notNull().default(false),
    intentRouteSignupSubmitted: integer("intent_route_signup_submitted", { mode: "boolean" }).notNull().default(false),

    // Engagement flags
    engagementRespondedFast: integer("engagement_responded_fast", { mode: "boolean" }).notNull().default(false),
    engagementRespondedSlow: integer("engagement_responded_slow", { mode: "boolean" }).notNull().default(false),

    // Negative flags
    negativeNoContactMethod: integer("negative_no_contact_method", { mode: "boolean" }).notNull().default(false),
    negativeOffNetworkRequest: integer("negative_off_network_request", { mode: "boolean" }).notNull().default(false),
    negativePriceObjection: integer("negative_price_objection", { mode: "boolean" }).notNull().default(false),
    negativeGhostedAfterPaymentSent: integer("negative_ghosted_after_payment_sent", { mode: "boolean" }).notNull().default(false),

    // Lifecycle
    customerHasFlown: integer("customer_has_flown", { mode: "boolean" }).notNull().default(false),

    // Computed scores
    scoreFit: integer("score_fit").notNull().default(0),
    scoreIntent: integer("score_intent").notNull().default(0),
    scoreEngagement: integer("score_engagement").notNull().default(0),
    scoreNegative: integer("score_negative").notNull().default(0),
    scoreTotal: integer("score_total").notNull().default(0),
    scoreUpdatedAt: text("score_updated_at"),

    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("lead_scores_general_lead_id_unique").on(table.generalLeadId),
    index("lead_scores_website_booking_request_id_idx").on(table.websiteBookingRequestId),
    index("lead_scores_route_signup_id_idx").on(table.routeSignupId),
    index("lead_scores_score_total_idx").on(table.scoreTotal),
  ],
);
