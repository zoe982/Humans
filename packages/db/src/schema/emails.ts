import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const emails = sqliteTable(
  "emails",
  {
    id: text("id").primaryKey(),
    displayId: text("display_id").notNull().unique(),
    humanId: text("human_id"),
    accountId: text("account_id"),
    generalLeadId: text("general_lead_id"),
    websiteBookingRequestId: text("website_booking_request_id"),
    routeSignupId: text("route_signup_id"),
    email: text("email").notNull(),
    labelId: text("label_id"),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("emails_human_id_idx").on(table.humanId),
    index("emails_account_id_idx").on(table.accountId),
    index("emails_general_lead_id_idx").on(table.generalLeadId),
    index("emails_website_booking_request_id_idx").on(table.websiteBookingRequestId),
    index("emails_route_signup_id_idx").on(table.routeSignupId),
  ],
);
