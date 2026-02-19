import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const accountEmailLabelsConfig = sqliteTable("account_email_labels_config", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: text("created_at").notNull(),
});
