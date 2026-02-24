import { sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { colleagues } from "./colleagues";

export const entityNextActionTypes = [
  "route_signup",
  "general_lead",
  "website_booking_request",
] as const;
export type EntityNextActionType = (typeof entityNextActionTypes)[number];

export const entityNextActions = sqliteTable(
  "entity_next_actions",
  {
    id: text("id").primaryKey(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    ownerId: text("owner_id").references(() => colleagues.id),
    description: text("description"),
    type: text("type"),
    startDate: text("start_date"),
    dueDate: text("due_date"),
    completedAt: text("completed_at"),
    cadenceNote: text("cadence_note"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("entity_next_actions_entity_type_entity_id_unique").on(
      table.entityType,
      table.entityId,
    ),
  ],
);
