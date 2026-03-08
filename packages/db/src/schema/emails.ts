import { pgTable, text, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";

export const emails = pgTable(
  "emails",
  {
    id: text("id").primaryKey(),
    displayId: text("display_id").notNull().unique(),
    humanId: text("human_id"),
    accountId: text("account_id"),
    generalLeadId: text("general_lead_id"),
    websiteBookingRequestId: text("website_booking_request_id"),
    routeSignupId: text("route_signup_id"),
    evacuationLeadId: text("evacuation_lead_id"),
    email: text("email").notNull(),
    labelId: text("label_id"),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("emails_email_unique").on(table.email),
    index("emails_human_id_idx").on(table.humanId),
    index("emails_account_id_idx").on(table.accountId),
    index("emails_general_lead_id_idx").on(table.generalLeadId),
    index("emails_website_booking_request_id_idx").on(table.websiteBookingRequestId),
    index("emails_route_signup_id_idx").on(table.routeSignupId),
    index("emails_evacuation_lead_id_idx").on(table.evacuationLeadId),
  ],
);
