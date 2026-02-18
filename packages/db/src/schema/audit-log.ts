import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./users";

export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  changes: text("changes", { mode: "json" }).$type<Record<string, unknown>>(),
  ipAddress: text("ip_address"),
  createdAt: text("created_at").notNull(),
});
