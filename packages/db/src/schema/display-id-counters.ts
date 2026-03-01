import { pgTable, text, integer } from "drizzle-orm/pg-core";

export const displayIdCounters = pgTable("display_id_counters", {
  prefix: text("prefix").primaryKey(),
  counter: integer("counter").notNull().default(0),
});
