import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { humans } from "./humans";

export const humanWebsiteBookingRequests = sqliteTable("human_website_booking_requests", {
  id: text("id").primaryKey(),
  humanId: text("human_id")
    .notNull()
    .references(() => humans.id),
  websiteBookingRequestId: text("website_booking_request_id").notNull(),
  linkedAt: text("linked_at").notNull(),
});
