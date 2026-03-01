import { pgTable, text } from "drizzle-orm/pg-core";

export const phoneLabelsConfig = pgTable("phone_labels_config", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: text("created_at").notNull(),
});
