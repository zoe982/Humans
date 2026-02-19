import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const roles = ["admin", "manager", "agent", "viewer"] as const;
export type Role = (typeof roles)[number];

export const colleagues = sqliteTable("colleagues", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  middleNames: text("middle_names"),
  lastName: text("last_name").notNull(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  googleId: text("google_id").unique(),
  role: text("role", { enum: roles }).notNull().default("viewer"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
