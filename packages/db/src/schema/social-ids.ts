import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { socialIdPlatformsConfig } from "./social-id-platforms-config";

export const socialIds = sqliteTable(
  "social_ids",
  {
    id: text("id").primaryKey(),
    displayId: text("display_id").notNull().unique(),
    handle: text("handle").notNull(),
    platformId: text("platform_id").references(() => socialIdPlatformsConfig.id),
    humanId: text("human_id"),
    accountId: text("account_id"),
    generalLeadId: text("general_lead_id"),
    websiteBookingRequestId: text("website_booking_request_id"),
    routeSignupId: text("route_signup_id"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("social_ids_human_id_idx").on(table.humanId),
    index("social_ids_account_id_idx").on(table.accountId),
    index("social_ids_general_lead_id_idx").on(table.generalLeadId),
    index("social_ids_website_booking_request_id_idx").on(table.websiteBookingRequestId),
    index("social_ids_route_signup_id_idx").on(table.routeSignupId),
  ],
);
