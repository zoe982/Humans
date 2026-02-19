import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { humans } from "./humans";

export const humanTypeValues = ["client", "trainer", "travel_agent", "flight_broker"] as const;
export type HumanType = (typeof humanTypeValues)[number];

export const humanTypes = sqliteTable("human_types", {
  id: text("id").primaryKey(),
  humanId: text("human_id")
    .notNull()
    .references(() => humans.id),
  type: text("type", { enum: humanTypeValues }).notNull(),
  createdAt: text("created_at").notNull(),
});
