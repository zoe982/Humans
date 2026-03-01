import { pgTable, text, index } from "drizzle-orm/pg-core";
import { opportunities } from "./opportunities";
import { humans } from "./humans";
import { opportunityHumanRolesConfig } from "./opportunity-human-roles-config";

export const opportunityHumans = pgTable(
  "opportunity_humans",
  {
    id: text("id").primaryKey(),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id),
    humanId: text("human_id")
      .notNull()
      .references(() => humans.id),
    roleId: text("role_id").references(() => opportunityHumanRolesConfig.id),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("opportunity_humans_opportunity_id_idx").on(table.opportunityId),
    index("opportunity_humans_human_id_idx").on(table.humanId),
  ],
);
