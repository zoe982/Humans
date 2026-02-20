import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { humans } from "./humans";

export const pets = sqliteTable("pets", {
  id: text("id").primaryKey(),
  displayId: text("display_id").notNull().unique(),
  humanId: text("human_id")
    .references(() => humans.id),
  type: text("type").notNull().default("dog"),
  name: text("name").notNull(),
  breed: text("breed"),
  weight: real("weight"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
