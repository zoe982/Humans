import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { clients } from "./clients";
import { colleagues } from "./colleagues";

export const leadEventTypes = [
  "inquiry",
  "quote_requested",
  "quote_sent",
  "follow_up",
  "booking",
  "conversion",
  "lost",
] as const;
export type LeadEventType = (typeof leadEventTypes)[number];

export const leadEvents = sqliteTable("lead_events", {
  id: text("id").primaryKey(),
  clientId: text("client_id")
    .notNull()
    .references(() => clients.id),
  eventType: text("event_type", { enum: leadEventTypes }).notNull(),
  notes: text("notes"),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  createdByColleagueId: text("created_by_user_id").references(() => colleagues.id),
  createdAt: text("created_at").notNull(),
});
