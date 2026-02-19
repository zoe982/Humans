import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { humans } from "./humans";
import { geoInterests } from "./geo-interests";
import { activities } from "./activities";

export const geoInterestExpressions = sqliteTable(
  "geo_interest_expressions",
  {
    id: text("id").primaryKey(),
    humanId: text("human_id")
      .notNull()
      .references(() => humans.id),
    geoInterestId: text("geo_interest_id")
      .notNull()
      .references(() => geoInterests.id),
    activityId: text("activity_id").references(() => activities.id),
    notes: text("notes"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("geo_interest_expressions_human_id_idx").on(table.humanId),
    index("geo_interest_expressions_geo_interest_id_idx").on(table.geoInterestId),
  ],
);
