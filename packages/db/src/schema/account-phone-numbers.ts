import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { accounts } from "./accounts";
import { accountPhoneLabelsConfig } from "./account-phone-labels-config";

export const accountPhoneNumbers = sqliteTable("account_phone_numbers", {
  id: text("id").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id),
  phoneNumber: text("phone_number").notNull(),
  labelId: text("label_id")
    .references(() => accountPhoneLabelsConfig.id),
  hasWhatsapp: integer("has_whatsapp", { mode: "boolean" }).notNull().default(false),
  isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});
