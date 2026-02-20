import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { humans } from "./humans";
import { accounts } from "./accounts";
import { colleagues } from "./colleagues";

export const activityTypeValues = [
  "email",
  "whatsapp_message",
  "online_meeting",
  "phone_call",
  "social_message",
] as const;
export type ActivityType = (typeof activityTypeValues)[number];

export const activities = sqliteTable("activities", {
  id: text("id").primaryKey(),
  displayId: text("display_id").notNull().unique(),
  type: text("type", { enum: activityTypeValues }).notNull().default("email"),
  subject: text("subject").notNull(),
  body: text("body"),
  notes: text("notes"),
  activityDate: text("activity_date").notNull(),
  humanId: text("human_id").references(() => humans.id),
  accountId: text("account_id").references(() => accounts.id),
  routeSignupId: text("route_signup_id"),
  websiteBookingRequestId: text("website_booking_request_id"),
  gmailId: text("gmail_id"),
  frontId: text("front_id"),
  frontConversationId: text("front_conversation_id"),
  createdByColleagueId: text("created_by_user_id")
    .notNull()
    .references(() => colleagues.id),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
