import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const phones = sqliteTable(
  "phones",
  {
    id: text("id").primaryKey(),
    displayId: text("display_id").notNull().unique(),
    humanId: text("human_id"),
    accountId: text("account_id"),
    generalLeadId: text("general_lead_id"),
    websiteBookingRequestId: text("website_booking_request_id"),
    routeSignupId: text("route_signup_id"),
    phoneNumber: text("phone_number").notNull(),
    labelId: text("label_id"),
    hasWhatsapp: integer("has_whatsapp", { mode: "boolean" }).notNull().default(false),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("phones_human_id_idx").on(table.humanId),
    index("phones_account_id_idx").on(table.accountId),
    index("phones_general_lead_id_idx").on(table.generalLeadId),
    index("phones_website_booking_request_id_idx").on(table.websiteBookingRequestId),
    index("phones_route_signup_id_idx").on(table.routeSignupId),
  ],
);
