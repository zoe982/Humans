import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const socialIdPlatformsConfig = sqliteTable("social_id_platforms_config", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
});
