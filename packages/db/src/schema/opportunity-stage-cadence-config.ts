import { pgTable, text, integer } from "drizzle-orm/pg-core";

export const opportunityStageCadenceConfig = pgTable("opportunity_stage_cadence_config", {
  id: text("id").primaryKey(),
  stage: text("stage").notNull().unique(),
  cadenceHours: integer("cadence_hours").notNull(),
  displayText: text("display_text").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
