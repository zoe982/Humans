import { Hono } from "hono";
import { createWebsiteSchema, updateWebsiteSchema } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import {
  listWebsites,
  getWebsite,
  createWebsite,
  updateWebsite,
  deleteWebsite,
} from "../services/websites";
import type { AppContext } from "../types";

const websiteRoutes = new Hono<AppContext>();

websiteRoutes.use("/*", authMiddleware);

// List all websites
websiteRoutes.get("/api/websites", requirePermission("viewRecords"), async (c) => {
  const data = await listWebsites(c.get("db"));
  return c.json({ data });
});

// Get single website
websiteRoutes.get("/api/websites/:id", requirePermission("viewRecords"), async (c) => {
  const data = await getWebsite(c.get("db"), c.req.param("id"));
  return c.json({ data });
});

// Create website
websiteRoutes.post("/api/websites", requirePermission("manageHumans"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createWebsiteSchema.parse(body);
  const result = await createWebsite(c.get("db"), data);
  return c.json({ data: result }, 201);
});

// Update website
websiteRoutes.patch("/api/websites/:id", requirePermission("manageHumans"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateWebsiteSchema.parse(body);
  const result = await updateWebsite(c.get("db"), c.req.param("id"), data);
  return c.json({ data: result });
});

// Delete website
websiteRoutes.delete("/api/websites/:id", requirePermission("manageHumans"), async (c) => {
  await deleteWebsite(c.get("db"), c.req.param("id"));
  return c.json({ success: true });
});

export { websiteRoutes };
