import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const humanStatuses = ["open", "active", "closed"] as const;
export type HumanStatus = (typeof humanStatuses)[number];

export const humans = sqliteTable("humans", {
  id: text("id").primaryKey(),
  firstName: text("first_name").notNull(),
  middleName: text("middle_name"),
  lastName: text("last_name").notNull(),
  status: text("status", { enum: humanStatuses }).notNull().default("open"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
