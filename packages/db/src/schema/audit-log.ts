import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { colleagues } from "./colleagues";

export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  colleagueId: text("user_id").references(() => colleagues.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  changes: text("changes", { mode: "json" }).$type<Record<string, unknown>>(),
  ipAddress: text("ip_address"),
  createdAt: text("created_at").notNull(),
});
