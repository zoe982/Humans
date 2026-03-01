import { pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { humans } from "./humans";
import { opportunities } from "./opportunities";

export const humanWebsiteBookingRequests = pgTable("human_website_booking_requests", {
  id: text("id").primaryKey(),
  humanId: text("human_id")
    .notNull()
    .references(() => humans.id),
  websiteBookingRequestId: text("website_booking_request_id").notNull(),
  opportunityId: text("opportunity_id").references(() => opportunities.id),
  linkedAt: text("linked_at").notNull(),
}, (table) => [
  uniqueIndex("human_website_booking_requests_wbr_id_unique").on(table.websiteBookingRequestId),
]);
