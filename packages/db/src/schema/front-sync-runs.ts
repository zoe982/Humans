import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { colleagues } from "./colleagues";

export const frontSyncRunStatuses = [
  "running",
  "completed",
  "failed",
  "reverted",
] as const;
export type FrontSyncRunStatus = (typeof frontSyncRunStatuses)[number];

export const frontSyncRuns = sqliteTable("front_sync_runs", {
  id: text("id").primaryKey(),
  displayId: text("display_id").notNull().unique(),
  status: text("status", { enum: frontSyncRunStatuses })
    .notNull()
    .default("running"),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
  totalMessages: integer("total_messages").notNull().default(0),
  imported: integer("imported").notNull().default(0),
  skipped: integer("skipped").notNull().default(0),
  unmatched: integer("unmatched").notNull().default(0),
  errorCount: integer("error_count").notNull().default(0),
  errorMessages: text("error_messages"),
  linkedToHumans: integer("linked_to_humans").notNull().default(0),
  linkedToAccounts: integer("linked_to_accounts").notNull().default(0),
  linkedToRouteSignups: integer("linked_to_route_signups")
    .notNull()
    .default(0),
  linkedToBookings: integer("linked_to_bookings").notNull().default(0),
  linkedToColleagues: integer("linked_to_colleagues").notNull().default(0),
  initiatedByColleagueId: text("initiated_by_colleague_id").references(
    () => colleagues.id,
  ),
  createdAt: text("created_at").notNull(),
});
