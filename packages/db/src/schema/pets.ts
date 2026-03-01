import { pgTable, text, boolean, real } from "drizzle-orm/pg-core";
import { humans } from "./humans";

export const pets = pgTable("pets", {
  id: text("id").primaryKey(),
  displayId: text("display_id").notNull().unique(),
  humanId: text("human_id")
    .references(() => humans.id),
  type: text("type").notNull().default("dog"),
  name: text("name"),
  breed: text("breed"),
  weight: real("weight"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
