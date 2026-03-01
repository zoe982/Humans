import { pgTable, text } from "drizzle-orm/pg-core";
import { humans } from "./humans";
import { humanRelationshipLabelsConfig } from "./human-relationship-labels-config";

export const humanRelationships = pgTable("human_relationships", {
  id: text("id").primaryKey(),
  displayId: text("display_id").notNull().unique(),
  humanId1: text("human_id_1")
    .notNull()
    .references(() => humans.id),
  humanId2: text("human_id_2")
    .notNull()
    .references(() => humans.id),
  labelId: text("label_id")
    .references(() => humanRelationshipLabelsConfig.id),
  createdAt: text("created_at").notNull(),
});
