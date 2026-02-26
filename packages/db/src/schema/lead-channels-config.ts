import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const leadChannelsConfig = sqliteTable("lead_channels_config", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: text("created_at").notNull(),
});
