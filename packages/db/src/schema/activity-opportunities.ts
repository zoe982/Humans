import { pgTable, text, index, uniqueIndex } from "drizzle-orm/pg-core";
import { activities } from "./activities";
import { opportunities } from "./opportunities";

export const activityOpportunities = pgTable(
  "activity_opportunities",
  {
    id: text("id").primaryKey(),
    activityId: text("activity_id")
      .notNull()
      .references(() => activities.id),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("activity_opportunities_activity_opportunity_idx").on(
      table.activityId,
      table.opportunityId,
    ),
    index("activity_opportunities_activity_id_idx").on(table.activityId),
    index("activity_opportunities_opportunity_id_idx").on(table.opportunityId),
  ],
);
