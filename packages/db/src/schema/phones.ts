import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { phoneLabelsConfig } from "./phone-labels-config";

export const phoneOwnerTypes = ["human", "account"] as const;
export type PhoneOwnerType = (typeof phoneOwnerTypes)[number];

export const phones = sqliteTable(
  "phones",
  {
    id: text("id").primaryKey(),
    displayId: text("display_id").notNull().unique(),
    ownerType: text("owner_type", { enum: phoneOwnerTypes }).notNull(),
    ownerId: text("owner_id").notNull(),
    phoneNumber: text("phone_number").notNull(),
    labelId: text("label_id").references(() => phoneLabelsConfig.id),
    hasWhatsapp: integer("has_whatsapp", { mode: "boolean" }).notNull().default(false),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("phones_owner_type_owner_id_idx").on(table.ownerType, table.ownerId),
  ],
);
