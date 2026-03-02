import { Hono } from "hono";
import { ERROR_CODES } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { badRequest, notFound } from "../lib/errors";
import { sanitizeFilename, ALLOWED_UPLOAD_CONTENT_TYPES } from "../lib/sanitize-filename";
import {
  listDocuments,
  createDocument,
  deleteDocument,
} from "../services/documents";
import type { AppContext } from "../types";

const documentRoutes = new Hono<AppContext>();

documentRoutes.use("/*", authMiddleware);

// Upload a document (with optional entity linking + PDF validation)
documentRoutes.post("/api/documents/upload", requirePermission("createEditRecords"), async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file");

  if (file == null || !(file instanceof File)) {
    throw badRequest(ERROR_CODES.FILE_NOT_PROVIDED, "No file provided");
  }

  // Validate file size (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    throw badRequest(ERROR_CODES.FILE_TOO_LARGE, "File too large (max 10MB)");
  }

  // Validate file type against allowlist (prevents stored XSS via HTML/SVG uploads)
  if (!(ALLOWED_UPLOAD_CONTENT_TYPES as readonly string[]).includes(file.type)) {
    throw badRequest(ERROR_CODES.DOCUMENT_INVALID_TYPE, "File type not allowed");
  }

  const entityType = formData.get("entityType");
  const entityId = formData.get("entityId");

  // Entity-linked uploads must be PDF
  if (entityType != null && entityId != null) {
    if (file.type !== "application/pdf") {
      throw badRequest(ERROR_CODES.DOCUMENT_INVALID_TYPE, "Only PDF files are allowed");
    }
  }

  const safeName = sanitizeFilename(file.name);
  const key = `${crypto.randomUUID()}-${safeName}`;
  await c.env.DOCUMENTS.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  // If entity linking fields are provided, create D1 record
  if (typeof entityType === "string" && typeof entityId === "string") {
    const session = c.get("session");
    const doc = await createDocument(c.get("db"), {
      key,
      filename: file.name,
      contentType: file.type,
      sizeBytes: file.size,
      entityType,
      entityId,
      uploadedBy: session?.colleagueId ?? null,
    });
    return c.json({ data: doc }, 201);
  }

  return c.json({ data: { key } }, 201);
});

// List documents for an entity
documentRoutes.get("/api/documents", requirePermission("viewRecords"), async (c) => {
  const entityType = c.req.query("entityType");
  const entityId = c.req.query("entityId");

  if (entityType == null || entityId == null) {
    throw badRequest(ERROR_CODES.VALIDATION_FAILED, "entityType and entityId are required");
  }

  const data = await listDocuments(c.get("db"), entityType, entityId);
  return c.json({ data });
});

// Download a document by R2 key
documentRoutes.get("/api/documents/download/:key", requirePermission("viewRecords"), async (c) => {
  const key = c.req.param("key");
  const object = await c.env.DOCUMENTS.get(key);

  if (object == null) {
    throw notFound(ERROR_CODES.DOCUMENT_NOT_FOUND, "Document not found");
  }

  // Extract filename from R2 key (format: {uuid}-{filename}, UUID is 36 chars)
  const uuidLength = 36;
  const keyFilename = key.length > uuidLength + 1 && key.charAt(uuidLength) === "-"
    ? key.substring(uuidLength + 1)
    : key;
  const safeFilename = sanitizeFilename(keyFilename);

  const headers = new Headers();
  headers.set("Content-Type", object.httpMetadata?.contentType ?? "application/octet-stream");
  headers.set("Content-Disposition", `attachment; filename="${safeFilename}"`);
  headers.set("Cache-Control", "private, max-age=3600");

  return new Response(object.body, { headers });
});

// Delete a document (D1 + R2)
documentRoutes.delete("/api/documents/:id", requirePermission("createEditRecords"), async (c) => {
  await deleteDocument(c.get("db"), c.env.DOCUMENTS, c.req.param("id"));
  return c.json({ success: true });
});

export { documentRoutes };
