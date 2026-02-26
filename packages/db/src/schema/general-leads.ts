import { sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { colleagues } from "./colleagues";
import { humans } from "./humans";

export const generalLeadStatuses = [
  "open",
  "qualified",
  "closed_converted",
  "closed_rejected",
] as const;
export type GeneralLeadStatus = (typeof generalLeadStatuses)[number];

export const generalLeads = sqliteTable("general_leads", {
  id: text("id").primaryKey(),
  displayId: text("display_id").notNull().unique(),
  status: text("status", { enum: generalLeadStatuses }).notNull().default("open"),
  firstName: text("first_name").notNull(),
  middleName: text("middle_name"),
  lastName: text("last_name").notNull(),
  notes: text("notes"),
  rejectReason: text("reject_reason"),
  convertedHumanId: text("converted_human_id").references(() => humans.id),
  ownerId: text("owner_id").references(() => colleagues.id),
  frontConversationId: text("front_conversation_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("general_leads_front_conversation_id_unique")
    .on(table.frontConversationId)
    .where(sql`front_conversation_id IS NOT NULL`),
]);
