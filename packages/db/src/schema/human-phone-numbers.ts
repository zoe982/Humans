import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { humans } from "./humans";

export const phoneLabels = ["mobile", "home", "work", "other"] as const;
export type PhoneLabel = (typeof phoneLabels)[number];

export const humanPhoneNumbers = sqliteTable("human_phone_numbers", {
  id: text("id").primaryKey(),
  humanId: text("human_id")
    .notNull()
    .references(() => humans.id),
  phoneNumber: text("phone_number").notNull(),
  label: text("label", { enum: phoneLabels }).notNull().default("mobile"),
  hasWhatsapp: integer("has_whatsapp", { mode: "boolean" }).notNull().default(false),
  isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});
