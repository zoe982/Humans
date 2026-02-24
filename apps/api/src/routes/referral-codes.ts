import { Hono } from "hono";
import { createReferralCodeSchema, updateReferralCodeSchema } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { supabaseMiddleware } from "../middleware/supabase";
import {
  listReferralCodes,
  getReferralCode,
  createReferralCode,
  updateReferralCode,
  deleteReferralCode,
} from "../services/referral-codes";
import type { AppContext } from "../types";

const referralCodeRoutes = new Hono<AppContext>();

referralCodeRoutes.use("/*", authMiddleware);
referralCodeRoutes.use("/*", supabaseMiddleware);

// List all referral codes
referralCodeRoutes.get("/api/referral-codes", requirePermission("viewRecords"), async (c) => {
  const data = await listReferralCodes(c.get("supabase"), c.get("db"));
  return c.json({ data });
});

// Get single referral code
referralCodeRoutes.get("/api/referral-codes/:id", requirePermission("viewRecords"), async (c) => {
  const data = await getReferralCode(c.get("supabase"), c.get("db"), c.req.param("id"));
  return c.json({ data });
});

// Create referral code
referralCodeRoutes.post("/api/referral-codes", requirePermission("manageHumans"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createReferralCodeSchema.parse(body);
  const result = await createReferralCode(c.get("supabase"), c.get("db"), data);
  return c.json({ data: result }, 201);
});

// Update referral code
referralCodeRoutes.patch("/api/referral-codes/:id", requirePermission("manageHumans"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateReferralCodeSchema.parse(body);
  const result = await updateReferralCode(c.get("supabase"), c.req.param("id"), data);
  return c.json({ data: result });
});

// Delete referral code
referralCodeRoutes.delete("/api/referral-codes/:id", requirePermission("manageHumans"), async (c) => {
  await deleteReferralCode(c.get("supabase"), c.req.param("id"));
  return c.json({ success: true });
});

export { referralCodeRoutes };
