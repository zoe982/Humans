import { Hono } from "hono";
import { ERROR_CODES } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { badRequest, notFound } from "../lib/errors";
import type { AppContext } from "../types";

const documentRoutes = new Hono<AppContext>();

documentRoutes.use("/*", authMiddleware);

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

  const key = `${crypto.randomUUID()}-${file.name}`;
  await c.env.DOCUMENTS.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  return c.json({ data: { key } }, 201);
});

documentRoutes.get("/api/documents/:key", requirePermission("viewRecords"), async (c) => {
  const key = c.req.param("key");
  const object = await c.env.DOCUMENTS.get(key);

  if (object == null) {
    throw notFound(ERROR_CODES.DOCUMENT_NOT_FOUND, "Document not found");
  }

  const headers = new Headers();
  headers.set("Content-Type", object.httpMetadata?.contentType ?? "application/octet-stream");
  headers.set("Cache-Control", "private, max-age=3600");

  return new Response(object.body, { headers });
});

export { documentRoutes };
