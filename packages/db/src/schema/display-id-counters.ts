import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const displayIdCounters = sqliteTable("display_id_counters", {
  prefix: text("prefix").primaryKey(),
  counter: integer("counter").notNull().default(0),
});
