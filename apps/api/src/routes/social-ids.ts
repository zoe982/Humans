import { Hono } from "hono";
import { createSocialIdSchema, updateSocialIdSchema } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import {
  listSocialIds,
  getSocialId,
  createSocialId,
  updateSocialId,
  deleteSocialId,
} from "../services/social-ids";
import type { AppContext } from "../types";

const socialIdRoutes = new Hono<AppContext>();

socialIdRoutes.use("/*", authMiddleware);

// List all social IDs
socialIdRoutes.get("/api/social-ids", requirePermission("viewRecords"), async (c) => {
  const data = await listSocialIds(c.get("db"));
  return c.json({ data });
});

// Get single social ID
socialIdRoutes.get("/api/social-ids/:id", requirePermission("viewRecords"), async (c) => {
  const data = await getSocialId(c.get("db"), c.req.param("id"));
  return c.json({ data });
});

// Create social ID
socialIdRoutes.post("/api/social-ids", requirePermission("manageHumans"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createSocialIdSchema.parse(body);
  const result = await createSocialId(c.get("db"), data);
  return c.json({ data: result }, 201);
});

// Update social ID
socialIdRoutes.patch("/api/social-ids/:id", requirePermission("manageHumans"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateSocialIdSchema.parse(body);
  const result = await updateSocialId(c.get("db"), c.req.param("id"), data);
  return c.json({ data: result });
});

// Delete social ID
socialIdRoutes.delete("/api/social-ids/:id", requirePermission("manageHumans"), async (c) => {
  await deleteSocialId(c.get("db"), c.req.param("id"));
  return c.json({ success: true });
});

export { socialIdRoutes };
