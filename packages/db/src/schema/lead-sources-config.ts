import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const leadSourcesConfig = sqliteTable("lead_sources_config", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: text("created_at").notNull(),
});
