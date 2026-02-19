import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { humans } from "./humans";

export const humanRouteSignups = sqliteTable("human_route_signups", {
  id: text("id").primaryKey(),
  humanId: text("human_id")
    .notNull()
    .references(() => humans.id),
  routeSignupId: text("route_signup_id").notNull(),
  linkedAt: text("linked_at").notNull(),
});
