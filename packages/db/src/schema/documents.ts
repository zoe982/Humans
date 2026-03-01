import { pgTable, text, integer, index } from "drizzle-orm/pg-core";

export const documents = pgTable(
  "documents",
  {
    id: text("id").primaryKey(),
    displayId: text("display_id").notNull().unique(),
    key: text("key").notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    uploadedBy: text("uploaded_by"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("documents_entity_idx").on(table.entityType, table.entityId),
    index("documents_key_idx").on(table.key),
  ],
);
