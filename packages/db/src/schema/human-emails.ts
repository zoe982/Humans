import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { humans } from "./humans";
import { humanEmailLabelsConfig } from "./human-email-labels-config";

export const humanEmails = sqliteTable("human_emails", {
  id: text("id").primaryKey(),
  humanId: text("human_id")
    .notNull()
    .references(() => humans.id),
  email: text("email").notNull(),
  labelId: text("label_id").references(() => humanEmailLabelsConfig.id),
  isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});
