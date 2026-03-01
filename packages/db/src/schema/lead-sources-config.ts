import { pgTable, text } from "drizzle-orm/pg-core";

export const leadSourcesConfig = pgTable("lead_sources_config", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: text("created_at").notNull(),
});
