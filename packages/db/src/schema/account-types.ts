import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { accounts } from "./accounts";
import { accountTypesConfig } from "./account-types-config";

export const accountTypes = sqliteTable("account_types", {
  id: text("id").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id),
  typeId: text("type_id")
    .notNull()
    .references(() => accountTypesConfig.id),
  createdAt: text("created_at").notNull(),
});
