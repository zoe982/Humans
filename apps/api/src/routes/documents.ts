import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import type { AppContext } from "../types";

const documentRoutes = new Hono<AppContext>();

documentRoutes.use("/*", authMiddleware);

documentRoutes.post("/api/documents/upload", requirePermission("createEditRecords"), async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return c.json({ error: "No file provided" }, 400);
  }

  // Validate file size (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    return c.json({ error: "File too large (max 10MB)" }, 400);
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

  if (!object) {
    return c.json({ error: "Document not found" }, 404);
  }

  const headers = new Headers();
  headers.set("Content-Type", object.httpMetadata?.contentType ?? "application/octet-stream");
  headers.set("Cache-Control", "private, max-age=3600");

  return new Response(object.body, { headers });
});

export { documentRoutes };
