import { pgTable, text, index } from "drizzle-orm/pg-core";

export const agreementStatuses = ["open", "active", "closed_inactive"] as const;
export type AgreementStatus = (typeof agreementStatuses)[number];

export const agreements = pgTable(
  "agreements",
  {
    id: text("id").primaryKey(),
    displayId: text("display_id").notNull().unique(),
    title: text("title").notNull(),
    typeId: text("type_id"),
    status: text("status", { enum: agreementStatuses }).notNull().default("open"),
    activationDate: text("activation_date"),
    notes: text("notes"),
    humanId: text("human_id"),
    accountId: text("account_id"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("agreements_human_id_idx").on(table.humanId),
    index("agreements_account_id_idx").on(table.accountId),
  ],
);
