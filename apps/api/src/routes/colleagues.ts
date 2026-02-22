import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { listColleagues } from "../services/admin";
import type { AppContext } from "../types";

const colleagueRoutes = new Hono<AppContext>();

colleagueRoutes.use("/*", authMiddleware);

colleagueRoutes.get("/api/colleagues", requirePermission("viewRecords"), async (c) => {
  const data = await listColleagues(c.get("db"));
  return c.json({ data });
});

export { colleagueRoutes };
