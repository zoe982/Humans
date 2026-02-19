import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const accountStatuses = ["open", "active", "closed"] as const;
export type AccountStatus = (typeof accountStatuses)[number];

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status", { enum: accountStatuses }).notNull().default("open"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
