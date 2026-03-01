import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { opportunityStageCadenceConfig } from "@humans/db/schema";
import { updateCadenceConfigSchema, ERROR_CODES } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { notFound } from "../lib/errors";
import type { AppContext } from "../types";

const opportunityCadenceRoutes = new Hono<AppContext>();

opportunityCadenceRoutes.use("/*", authMiddleware);

// List all cadence configs
opportunityCadenceRoutes.get("/api/opportunity-cadence", requirePermission("viewRecords"), async (c) => {
  const db = c.get("db");
  const data = await db.select().from(opportunityStageCadenceConfig);
  return c.json({ data });
});

// Update a cadence config (admin only)
opportunityCadenceRoutes.patch("/api/admin/opportunity-cadence/:id", requirePermission("manageColleagues"), async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const [existing] = await db.select().from(opportunityStageCadenceConfig).where(eq(opportunityStageCadenceConfig.id, id));
  if (existing == null) {
    throw notFound(ERROR_CODES.CADENCE_CONFIG_NOT_FOUND, "Cadence config not found");
  }

  const body: unknown = await c.req.json();
  const data = updateCadenceConfigSchema.parse(body);

  const now = new Date().toISOString();
  await db.update(opportunityStageCadenceConfig).set({
    cadenceHours: data.cadenceHours,
    displayText: data.displayText,
    updatedAt: now,
  }).where(eq(opportunityStageCadenceConfig.id, id));

  const [updated] = await db.select().from(opportunityStageCadenceConfig).where(eq(opportunityStageCadenceConfig.id, id));
  return c.json({ data: updated });
});

export { opportunityCadenceRoutes };
