import { pgTable, text } from "drizzle-orm/pg-core";

export const humanEmailLabelsConfig = pgTable("human_email_labels_config", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: text("created_at").notNull(),
});
