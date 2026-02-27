import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const lossReasonsConfig = sqliteTable("loss_reasons_config", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: text("created_at").notNull(),
});
