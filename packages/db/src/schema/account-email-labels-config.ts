import { pgTable, text } from "drizzle-orm/pg-core";

export const accountEmailLabelsConfig = pgTable("account_email_labels_config", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: text("created_at").notNull(),
});
