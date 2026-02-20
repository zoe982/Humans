import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

export const errorLogResolutionStatuses = ["open", "resolved"] as const;
export type ErrorLogResolutionStatus = (typeof errorLogResolutionStatuses)[number];

export const errorLog = sqliteTable(
  "error_log",
  {
    id: text("id").primaryKey(),
    displayId: text("display_id").notNull(),
    requestId: text("request_id").notNull(),
    code: text("code").notNull(),
    message: text("message").notNull(),
    status: integer("status").notNull(),
    resolutionStatus: text("resolution_status").notNull().default("open").$type<ErrorLogResolutionStatus>(),
    method: text("method"),
    path: text("path"),
    userId: text("user_id"),
    details: text("details", { mode: "json" }).$type<unknown>(),
    stack: text("stack"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("error_log_display_id_idx").on(table.displayId),
    index("error_log_request_id_idx").on(table.requestId),
    index("error_log_code_idx").on(table.code),
    index("error_log_created_at_idx").on(table.createdAt),
    index("error_log_resolution_status_idx").on(table.resolutionStatus),
  ],
);
