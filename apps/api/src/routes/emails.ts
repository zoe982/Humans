import { Hono } from "hono";
import { createEmailSchema, updateEmailSchema } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { supabaseMiddleware } from "../middleware/supabase";
import {
  listEmails,
  getEmail,
  createEmail,
  updateEmail,
  deleteEmail,
} from "../services/emails";
import type { AppContext } from "../types";

const emailRoutes = new Hono<AppContext>();

emailRoutes.use("/*", authMiddleware);

// List all emails with human names
emailRoutes.get("/api/emails", requirePermission("viewRecords"), async (c) => {
  const data = await listEmails(c.get("db"));
  return c.json({ data });
});

// Get single email
emailRoutes.get("/api/emails/:id", requirePermission("viewRecords"), supabaseMiddleware, async (c) => {
  const data = await getEmail(c.get("db"), c.req.param("id"));

  if (data.websiteBookingRequestId != null) {
    const supabase = c.get("supabase");
    const { data: bor } = await supabase
      .from("bookings")
      .select("crm_display_id, first_name, last_name")
      .eq("id", data.websiteBookingRequestId)
      .single();
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
      .single();
    if (rou != null) {
      const rouData = rou as { display_id?: string | null; first_name?: string | null; last_name?: string | null };
      data.routeSignupDisplayId = typeof rouData.display_id === "string" ? rouData.display_id : null;
      const rouName = [rouData.first_name, rouData.last_name].filter(Boolean).join(" ");
      data.routeSignupName = rouName !== "" ? rouName : null;
    }
  }

  return c.json({ data });
});

// Update email
emailRoutes.patch("/api/emails/:id", requirePermission("manageHumans"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateEmailSchema.parse(body);
  const result = await updateEmail(c.get("db"), c.req.param("id"), data);
  return c.json({ data: result });
});

// Create email
emailRoutes.post("/api/emails", requirePermission("manageHumans"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createEmailSchema.parse(body);
  const result = await createEmail(c.get("db"), data);
  return c.json({ data: result }, 201);
});

// Delete email
emailRoutes.delete("/api/emails/:id", requirePermission("manageHumans"), async (c) => {
  await deleteEmail(c.get("db"), c.req.param("id"));
  return c.json({ success: true });
});

export { emailRoutes };
