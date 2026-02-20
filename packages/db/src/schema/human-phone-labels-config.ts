import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const humanPhoneLabelsConfig = sqliteTable("human_phone_labels_config", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: text("created_at").notNull(),
});
