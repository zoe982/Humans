import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const humanRelationshipLabelsConfig = sqliteTable("human_relationship_labels_config", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: text("created_at").notNull(),
});
