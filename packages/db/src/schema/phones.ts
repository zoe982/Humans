import { pgTable, text, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";

export const phones = pgTable(
  "phones",
  {
    id: text("id").primaryKey(),
    displayId: text("display_id").notNull().unique(),
    humanId: text("human_id"),
    accountId: text("account_id"),
    generalLeadId: text("general_lead_id"),
    websiteBookingRequestId: text("website_booking_request_id"),
    routeSignupId: text("route_signup_id"),
    evacuationLeadId: text("evacuation_lead_id"),
    phoneNumber: text("phone_number").notNull(),
    labelId: text("label_id"),
    hasWhatsapp: boolean("has_whatsapp").notNull().default(false),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("phones_phone_number_unique").on(table.phoneNumber),
    index("phones_human_id_idx").on(table.humanId),
    index("phones_account_id_idx").on(table.accountId),
    index("phones_general_lead_id_idx").on(table.generalLeadId),
    index("phones_website_booking_request_id_idx").on(table.websiteBookingRequestId),
    index("phones_route_signup_id_idx").on(table.routeSignupId),
    index("phones_evacuation_lead_id_idx").on(table.evacuationLeadId),
  ],
);
