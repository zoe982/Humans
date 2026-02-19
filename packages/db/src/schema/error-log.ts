import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const errorLog = sqliteTable(
  "error_log",
  {
    id: text("id").primaryKey(),
    requestId: text("request_id").notNull(),
    code: text("code").notNull(),
    message: text("message").notNull(),
    status: integer("status").notNull(),
    method: text("method"),
    path: text("path"),
    userId: text("user_id"),
    details: text("details", { mode: "json" }).$type<unknown>(),
    stack: text("stack"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("error_log_request_id_idx").on(table.requestId),
    index("error_log_code_idx").on(table.code),
    index("error_log_created_at_idx").on(table.createdAt),
  ],
);
