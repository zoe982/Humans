import { pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { humans } from "./humans";

export const humanRouteSignups = pgTable("human_route_signups", {
  id: text("id").primaryKey(),
  humanId: text("human_id")
    .notNull()
    .references(() => humans.id),
  routeSignupId: text("route_signup_id").notNull(),
  linkedAt: text("linked_at").notNull(),
}, (table) => [
  uniqueIndex("human_route_signups_route_signup_id_unique").on(table.routeSignupId),
]);
