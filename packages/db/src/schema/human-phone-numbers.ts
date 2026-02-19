import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { humans } from "./humans";
import { humanPhoneLabelsConfig } from "./human-phone-labels-config";

export const humanPhoneNumbers = sqliteTable("human_phone_numbers", {
  id: text("id").primaryKey(),
  humanId: text("human_id")
    .notNull()
    .references(() => humans.id),
  phoneNumber: text("phone_number").notNull(),
  labelId: text("label_id").references(() => humanPhoneLabelsConfig.id),
  hasWhatsapp: integer("has_whatsapp", { mode: "boolean" }).notNull().default(false),
  isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});
