import { eq, and } from "drizzle-orm";
import { documents } from "@humans/db/schema";
import { createId } from "@humans/db";
import { ERROR_CODES } from "@humans/shared";
import { notFound } from "../lib/errors";
import { nextDisplayId } from "../lib/display-id";
import type { DB } from "./types";

export async function listDocuments(
  db: DB,
  entityType: string,
  entityId: string,
): Promise<(typeof documents.$inferSelect)[]> {
  return db
    .select()
    .from(documents)
    .where(and(eq(documents.entityType, entityType), eq(documents.entityId, entityId)));
}

export async function createDocument(
  db: DB,
  data: {
    key: string;
    filename: string;
    contentType: string;
    sizeBytes: number;
    entityType: string;
    entityId: string;
    uploadedBy?: string | null;
  },
): Promise<typeof documents.$inferSelect> {
  const now = new Date().toISOString();
  const displayId = await nextDisplayId(db, "DOC");

  const record = {
    id: createId(),
    displayId,
    key: data.key,
    filename: data.filename,
    contentType: data.contentType,
    sizeBytes: data.sizeBytes,
    entityType: data.entityType,
    entityId: data.entityId,
    uploadedBy: data.uploadedBy ?? null,
    createdAt: now,
  };

  await db.insert(documents).values(record);
  return record;
}

export async function deleteDocument(
  db: DB,
  r2: R2Bucket,
  id: string,
): Promise<void> {
  const result = await db.select().from(documents).where(eq(documents.id, id));
  const doc = result[0];
  if (doc == null) {
    throw notFound(ERROR_CODES.DOCUMENT_NOT_FOUND, "Document not found");
  }

  await r2.delete(doc.key);
  await db.delete(documents).where(eq(documents.id, id));
}
