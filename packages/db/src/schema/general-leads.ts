import { pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { colleagues } from "./colleagues";
import { humans } from "./humans";

export const generalLeadStatuses = [
  "open",
  "pending_response",
  "qualified",
  "closed_lost",
  "closed_converted",
] as const;
export type GeneralLeadStatus = (typeof generalLeadStatuses)[number];

export const generalLeads = pgTable("general_leads", {
  id: text("id").primaryKey(),
  displayId: text("display_id").notNull().unique(),
  status: text("status", { enum: generalLeadStatuses }).notNull().default("open"),
  firstName: text("first_name").notNull(),
  middleName: text("middle_name"),
  lastName: text("last_name").notNull(),
  notes: text("notes"),
  rejectReason: text("reject_reason"),
  lossReason: text("loss_reason"),
  convertedHumanId: text("converted_human_id").references(() => humans.id),
  ownerId: text("owner_id").references(() => colleagues.id),
  frontConversationId: text("front_conversation_id"),
  source: text("source"),
  channel: text("channel"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("general_leads_front_conversation_id_unique")
    .on(table.frontConversationId)
    .where(sql`front_conversation_id IS NOT NULL`),
]);
