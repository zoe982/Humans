import { Hono } from "hono";
import { createPhoneNumberSchema, updatePhoneNumberSchema } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { supabaseMiddleware } from "../middleware/supabase";
import {
  listPhoneNumbers,
  listPhoneNumbersForHuman,
  getPhoneNumber,
  createPhoneNumber,
  updatePhoneNumber,
  deletePhoneNumber,
} from "../services/phone-numbers";
import type { AppContext } from "../types";

const phoneNumberRoutes = new Hono<AppContext>();

phoneNumberRoutes.use("/*", authMiddleware);

// List all phone numbers (with human name)
phoneNumberRoutes.get("/api/phone-numbers", requirePermission("viewRecords"), async (c) => {
  const data = await listPhoneNumbers(c.get("db"), c.req.query("q"));
  return c.json({ data });
});

// List phone numbers for a human
phoneNumberRoutes.get("/api/humans/:humanId/phone-numbers", requirePermission("viewRecords"), async (c) => {
  const data = await listPhoneNumbersForHuman(c.get("db"), c.req.param("humanId"));
  return c.json({ data });
});

// Get single phone number
phoneNumberRoutes.get("/api/phone-numbers/:id", requirePermission("viewRecords"), supabaseMiddleware, async (c) => {
  const data = await getPhoneNumber(c.get("db"), c.req.param("id"));

  if (data.websiteBookingRequestId != null) {
    const supabase = c.get("supabase");
    const { data: bor } = await supabase
      .from("bookings")
      .select("crm_display_id, first_name, last_name")
      .eq("id", data.websiteBookingRequestId)
      .maybeSingle();
    if (bor != null) {
      const borData = bor as { crm_display_id?: string | null; first_name?: string | null; last_name?: string | null };
      data.websiteBookingRequestDisplayId = typeof borData.crm_display_id === "string" ? borData.crm_display_id : null;
      const borName = [borData.first_name, borData.last_name].filter(Boolean).join(" ");
      data.websiteBookingRequestName = borName !== "" ? borName : null;
    }
  }

  if (data.routeSignupId != null) {
    const supabase = c.get("supabase");
    const { data: rou } = await supabase
      .from("announcement_signups")
      .select("display_id, first_name, last_name")
      .eq("id", data.routeSignupId)
      .maybeSingle();
    if (rou != null) {
      const rouData = rou as { display_id?: string | null; first_name?: string | null; last_name?: string | null };
      data.routeSignupDisplayId = typeof rouData.display_id === "string" ? rouData.display_id : null;
      const rouName = [rouData.first_name, rouData.last_name].filter(Boolean).join(" ");
      data.routeSignupName = rouName !== "" ? rouName : null;
    }
  }

  return c.json({ data });
});

// Create phone number
phoneNumberRoutes.post("/api/phone-numbers", requirePermission("manageHumans"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createPhoneNumberSchema.parse(body);
  const result = await createPhoneNumber(c.get("db"), data);
  return c.json({ data: result }, 201);
});

// Update phone number
phoneNumberRoutes.patch("/api/phone-numbers/:id", requirePermission("manageHumans"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updatePhoneNumberSchema.parse(body);
  const result = await updatePhoneNumber(c.get("db"), c.req.param("id"), data);
  return c.json({ data: result });
});

// Delete phone number
phoneNumberRoutes.delete("/api/phone-numbers/:id", requirePermission("manageHumans"), async (c) => {
  await deletePhoneNumber(c.get("db"), c.req.param("id"));
  return c.json({ success: true });
});

export { phoneNumberRoutes };
