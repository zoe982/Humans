import { integer, pgTable, text, boolean, uniqueIndex, index } from "drizzle-orm/pg-core";
import { generalLeads } from "./general-leads";

export const leadScores = pgTable(
  "lead_scores",
  {
    id: text("id").primaryKey(),
    displayId: text("display_id").notNull().unique(),

    // Parent FK — exactly one non-null (enforced in service layer)
    generalLeadId: text("general_lead_id").references(() => generalLeads.id),
    websiteBookingRequestId: text("website_booking_request_id"), // Supabase — no FK
    routeSignupId: text("route_signup_id"), // Supabase — no FK
    evacuationLeadId: text("evacuation_lead_id"), // Supabase — no FK

    // Fit flags
    fitMatchesCurrentWebsiteFlight: boolean("fit_matches_current_website_flight").notNull().default(false),
    fitPriceAcknowledgedOk: boolean("fit_price_acknowledged_ok").notNull().default(false),

    // Intent flags
    intentDepositPaid: boolean("intent_deposit_paid").notNull().default(false),
    intentPaymentDetailsSent: boolean("intent_payment_details_sent").notNull().default(false),
    intentRequestedPaymentDetails: boolean("intent_requested_payment_details").notNull().default(false),
    intentBookingSubmitted: boolean("intent_booking_submitted").notNull().default(false),
    intentBookingStarted: boolean("intent_booking_started").notNull().default(false),
    intentRouteSignupSubmitted: boolean("intent_route_signup_submitted").notNull().default(false),

    // Engagement flags
    engagementRespondedFast: boolean("engagement_responded_fast").notNull().default(false),
    engagementRespondedSlow: boolean("engagement_responded_slow").notNull().default(false),

    // Negative flags
    negativeNoContactMethod: boolean("negative_no_contact_method").notNull().default(false),
    negativeOffNetworkRequest: boolean("negative_off_network_request").notNull().default(false),
    negativePriceObjection: boolean("negative_price_objection").notNull().default(false),
    negativeGhostedAfterPaymentSent: boolean("negative_ghosted_after_payment_sent").notNull().default(false),

    // Lifecycle
    customerHasFlown: boolean("customer_has_flown").notNull().default(false),

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
    index("lead_scores_evacuation_lead_id_idx").on(table.evacuationLeadId),
  ],
);
