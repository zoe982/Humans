import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";

export const websites = sqliteTable(
  "websites",
  {
    id: text("id").primaryKey(),
    displayId: text("display_id").notNull().unique(),
    url: text("url").notNull(),
    humanId: text("human_id"),
    accountId: text("account_id"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("websites_human_id_idx").on(table.humanId),
    index("websites_account_id_idx").on(table.accountId),
  ],
);
