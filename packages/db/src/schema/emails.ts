import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const emailOwnerTypes = ["human", "account"] as const;
export type EmailOwnerType = (typeof emailOwnerTypes)[number];

export const emails = sqliteTable(
  "emails",
  {
    id: text("id").primaryKey(),
    displayId: text("display_id").notNull().unique(),
    ownerType: text("owner_type", { enum: emailOwnerTypes }).notNull(),
    ownerId: text("owner_id").notNull(),
    email: text("email").notNull(),
    labelId: text("label_id"),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("emails_owner_type_owner_id_idx").on(table.ownerType, table.ownerId),
  ],
);
