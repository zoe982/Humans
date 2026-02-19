import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { humans } from "./humans";

export const emailLabels = ["work", "personal", "other"] as const;
export type EmailLabel = (typeof emailLabels)[number];

export const humanEmails = sqliteTable("human_emails", {
  id: text("id").primaryKey(),
  humanId: text("human_id")
    .notNull()
    .references(() => humans.id),
  email: text("email").notNull(),
  label: text("label", { enum: emailLabels }).notNull().default("personal"),
  isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});
