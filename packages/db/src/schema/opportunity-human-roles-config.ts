import { pgTable, text } from "drizzle-orm/pg-core";

export const opportunityHumanRolesConfig = pgTable("opportunity_human_roles_config", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: text("created_at").notNull(),
});
