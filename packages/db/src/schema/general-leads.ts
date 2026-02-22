import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { colleagues } from "./colleagues";
import { humans } from "./humans";

export const generalLeadStatuses = [
  "open",
  "qualified",
  "closed_converted",
  "closed_rejected",
] as const;
export type GeneralLeadStatus = (typeof generalLeadStatuses)[number];

export const generalLeadSources = [
  "whatsapp",
  "email",
  "direct_referral",
] as const;
export type GeneralLeadSource = (typeof generalLeadSources)[number];

export const generalLeads = sqliteTable("general_leads", {
  id: text("id").primaryKey(),
  displayId: text("display_id").notNull().unique(),
  status: text("status", { enum: generalLeadStatuses }).notNull().default("open"),
  source: text("source", { enum: generalLeadSources }).notNull(),
  notes: text("notes"),
  rejectReason: text("reject_reason"),
  convertedHumanId: text("converted_human_id").references(() => humans.id),
  ownerId: text("owner_id").references(() => colleagues.id),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
