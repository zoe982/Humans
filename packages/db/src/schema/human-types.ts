import { pgTable, text } from "drizzle-orm/pg-core";
import { humans } from "./humans";
import { humanTypesConfig } from "./human-types-config";

export const humanTypes = pgTable("human_types", {
  id: text("id").primaryKey(),
  humanId: text("human_id")
    .notNull()
    .references(() => humans.id),
  typeId: text("type_id")
    .notNull()
    .references(() => humanTypesConfig.id),
  createdAt: text("created_at").notNull(),
});
