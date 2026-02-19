import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { accounts } from "./accounts";
import { humans } from "./humans";
import { accountHumanLabelsConfig } from "./account-human-labels-config";

export const accountHumans = sqliteTable("account_humans", {
  id: text("id").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id),
  humanId: text("human_id")
    .notNull()
    .references(() => humans.id),
  labelId: text("label_id")
    .references(() => accountHumanLabelsConfig.id),
  createdAt: text("created_at").notNull(),
});
