import { Hono } from "hono";
import { updateDiscountCodeSchema } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { supabaseMiddleware } from "../middleware/supabase";
import {
  listDiscountCodes,
  getDiscountCode,
  updateDiscountCode,
} from "../services/discount-codes";
import type { AppContext } from "../types";

const discountCodeRoutes = new Hono<AppContext>();

discountCodeRoutes.use("/*", authMiddleware);
discountCodeRoutes.use("/*", supabaseMiddleware);

// List all discount codes
discountCodeRoutes.get("/api/discount-codes", requirePermission("viewRecords"), async (c) => {
  const data = await listDiscountCodes(c.get("supabase"), c.get("db"));
  return c.json({ data });
});

// Get single discount code
discountCodeRoutes.get("/api/discount-codes/:id", requirePermission("viewRecords"), async (c) => {
  const data = await getDiscountCode(c.get("supabase"), c.get("db"), c.req.param("id"));
  return c.json({ data });
});

// Update discount code (human/account links only)
discountCodeRoutes.patch("/api/discount-codes/:id", requirePermission("manageHumans"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateDiscountCodeSchema.parse(body);
  const result = await updateDiscountCode(c.get("supabase"), c.req.param("id"), data);
  return c.json({ data: result });
});

export { discountCodeRoutes };
