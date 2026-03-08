import { pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { humans } from "./humans";

export const humanEvacuationLeads = pgTable("human_evacuation_leads", {
  id: text("id").primaryKey(),
  humanId: text("human_id")
    .notNull()
    .references(() => humans.id),
  evacuationLeadId: text("evacuation_lead_id").notNull(),
  linkedAt: text("linked_at").notNull(),
}, (table) => [
  uniqueIndex("human_evacuation_leads_evacuation_lead_id_unique").on(table.evacuationLeadId),
]);
