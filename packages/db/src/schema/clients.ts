import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./users";

export const clientStatuses = ["active", "inactive", "prospect"] as const;
export type ClientStatus = (typeof clientStatuses)[number];

export const clients = sqliteTable("clients", {
  id: text("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  address: text("address", { mode: "json" }).$type<{
    street?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    zip?: string | undefined;
    country?: string | undefined;
  }>(),
  status: text("status", { enum: clientStatuses }).notNull().default("prospect"),
  notes: text("notes"),
  leadSourceId: text("lead_source_id"),
  assignedToUserId: text("assigned_to_user_id").references(() => users.id),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
