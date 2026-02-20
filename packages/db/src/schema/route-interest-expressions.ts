import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { humans } from "./humans";
import { routeInterests } from "./route-interests";
import { activities } from "./activities";

export const routeInterestFrequencyValues = ["one_time", "repeat"] as const;
export type RouteInterestFrequency = (typeof routeInterestFrequencyValues)[number];

export const routeInterestExpressions = sqliteTable(
  "route_interest_expressions",
  {
    id: text("id").primaryKey(),
    displayId: text("display_id").notNull().unique(),
    humanId: text("human_id")
      .notNull()
      .references(() => humans.id),
    routeInterestId: text("route_interest_id")
      .notNull()
      .references(() => routeInterests.id),
    activityId: text("activity_id").references(() => activities.id),
    frequency: text("frequency").notNull().default("one_time"),
    travelYear: integer("travel_year"),
    travelMonth: integer("travel_month"),
    travelDay: integer("travel_day"),
    notes: text("notes"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("route_interest_expressions_human_id_idx").on(table.humanId),
    index("route_interest_expressions_route_interest_id_idx").on(table.routeInterestId),
  ],
);
