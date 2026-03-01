import { pgTable, text } from "drizzle-orm/pg-core";

export const lossReasonsConfig = pgTable("loss_reasons_config", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: text("created_at").notNull(),
});
