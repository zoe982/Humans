import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { humans } from "./humans";
import { opportunities } from "./opportunities";

export const humanWebsiteBookingRequests = sqliteTable("human_website_booking_requests", {
  id: text("id").primaryKey(),
  humanId: text("human_id")
    .notNull()
    .references(() => humans.id),
  websiteBookingRequestId: text("website_booking_request_id").notNull(),
  opportunityId: text("opportunity_id").references(() => opportunities.id),
  linkedAt: text("linked_at").notNull(),
});
