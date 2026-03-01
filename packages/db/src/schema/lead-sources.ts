import { pgTable, text, boolean } from "drizzle-orm/pg-core";

export const leadSourceCategories = ["paid", "organic", "referral", "direct", "event"] as const;
export type LeadSourceCategory = (typeof leadSourceCategories)[number];

export const leadSources = pgTable("lead_sources", {
  id: text("id").primaryKey(),
  displayId: text("display_id").notNull().unique(),
  name: text("name").notNull(),
  category: text("category", { enum: leadSourceCategories }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
