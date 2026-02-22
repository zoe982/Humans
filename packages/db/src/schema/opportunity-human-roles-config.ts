import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const opportunityHumanRolesConfig = sqliteTable("opportunity_human_roles_config", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: text("created_at").notNull(),
});
