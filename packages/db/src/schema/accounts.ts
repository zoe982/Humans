import { pgTable, text } from "drizzle-orm/pg-core";

export const accountStatuses = ["open", "active", "closed"] as const;
export type AccountStatus = (typeof accountStatuses)[number];

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  displayId: text("display_id").notNull().unique(),
  name: text("name").notNull(),
  status: text("status", { enum: accountStatuses }).notNull().default("open"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
