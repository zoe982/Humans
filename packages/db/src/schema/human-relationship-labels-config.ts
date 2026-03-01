import { pgTable, text } from "drizzle-orm/pg-core";

export const humanRelationshipLabelsConfig = pgTable("human_relationship_labels_config", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: text("created_at").notNull(),
});
