import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const leadSourceCategories = ["paid", "organic", "referral", "direct", "event"] as const;
export type LeadSourceCategory = (typeof leadSourceCategories)[number];

export const leadSources = sqliteTable("lead_sources", {
  id: text("id").primaryKey(),
  displayId: text("display_id").notNull().unique(),
  name: text("name").notNull(),
  category: text("category", { enum: leadSourceCategories }).notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
