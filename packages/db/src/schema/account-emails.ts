import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { accounts } from "./accounts";
import { accountEmailLabelsConfig } from "./account-email-labels-config";

export const accountEmails = sqliteTable("account_emails", {
  id: text("id").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id),
  email: text("email").notNull(),
  labelId: text("label_id")
    .references(() => accountEmailLabelsConfig.id),
  isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});
