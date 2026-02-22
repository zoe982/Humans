import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { colleagues } from "./colleagues";

export const opportunityStages = [
  "open",
  "qualified",
  "deposit_request_sent",
  "deposit_received",
  "group_forming",
  "confirmed_to_operate",
  "paid",
  "docs_in_progress",
  "docs_complete",
  "closed_flown",
  "closed_lost",
] as const;
export type OpportunityStage = (typeof opportunityStages)[number];

export const opportunities = sqliteTable("opportunities", {
  id: text("id").primaryKey(),
  displayId: text("display_id").notNull().unique(),
  stage: text("stage", { enum: opportunityStages }).notNull().default("open"),
  seatsRequested: integer("seats_requested").notNull().default(1),
  lossReason: text("loss_reason"),
  nextActionOwnerId: text("next_action_owner_id").references(() => colleagues.id),
  nextActionDescription: text("next_action_description"),
  nextActionType: text("next_action_type"),
  nextActionDueDate: text("next_action_due_date"),
  nextActionCompletedAt: text("next_action_completed_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
