import { pgTable, text } from "drizzle-orm/pg-core";

export const socialIdPlatformsConfig = pgTable("social_id_platforms_config", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
});
