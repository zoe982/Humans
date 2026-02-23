import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const referralCodes = sqliteTable(
  "referral_codes",
  {
    id: text("id").primaryKey(),
    displayId: text("display_id").notNull().unique(),
    code: text("code").notNull().unique(),
    description: text("description"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    humanId: text("human_id"),
    accountId: text("account_id"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("referral_codes_human_id_idx").on(table.humanId),
    index("referral_codes_account_id_idx").on(table.accountId),
  ],
);
