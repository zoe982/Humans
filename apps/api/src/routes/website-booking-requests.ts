import { Hono } from "hono";
import type { SupabaseClient } from "@supabase/supabase-js";
import { updateWebsiteBookingRequestSchema, ERROR_CODES } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { supabaseMiddleware } from "../middleware/supabase";
import { internal, notFound, badRequest } from "../lib/errors";
import { nextDisplayId } from "../lib/display-id";
import type { AppContext } from "../types";
import type { DB } from "../services/types";

const websiteBookingRequestRoutes = new Hono<AppContext>();

websiteBookingRequestRoutes.use("/*", authMiddleware);
websiteBookingRequestRoutes.use("/*", supabaseMiddleware);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Auto-assign crm_display_id to bookings that don't have one yet.
 * Writes back to Supabase and mutates the row objects in place.
 */
async function ensureDisplayIds(
  supabase: SupabaseClient,
  db: DB,
  rows: unknown[],
): Promise<void> {
  for (const row of rows) {
    if (!isRecord(row)) continue;
    if (row["crm_display_id"] == null) {
      const displayId = await nextDisplayId(db, "BOR");
      const { error } = await supabase
        .from("bookings")
        .update({ crm_display_id: displayId })
        .eq("id", row["id"]);
      if (error === null) {
        row["crm_display_id"] = displayId;
      }
    }
  }
}

// List all website booking requests (paginated)
websiteBookingRequestRoutes.get(
  "/api/website-booking-requests",
  requirePermission("viewWebsiteBookingRequests"),
  async (c) => {
    const supabase = c.get("supabase");
    const db = c.get("db");
    const rawPage = Number(c.req.query("page"));
    const rawLimit = Number(c.req.query("limit"));
    const page = Math.max(1, rawPage !== 0 ? rawPage : 1);
    const limit = Math.min(100, Math.max(1, rawLimit !== 0 ? rawLimit : 25));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from("bookings")
      .select("*", { count: "exact" })
      .order("inserted_at", { ascending: false })
      .range(from, to);

    if (error !== null) {
      throw internal(ERROR_CODES.SUPABASE_ERROR, error.message);
    }

    // Auto-assign display IDs to rows missing them
    await ensureDisplayIds(supabase, db, data as unknown[]);

    return c.json({ data, meta: { page, limit, total: count ?? 0 } });
  },
);

// Get single website booking request
websiteBookingRequestRoutes.get(
  "/api/website-booking-requests/:id",
  requirePermission("viewWebsiteBookingRequests"),
  async (c) => {
    const supabase = c.get("supabase");
    const db = c.get("db");
    const result = await supabase
      .from("bookings")
      .select("*")
      .eq("id", c.req.param("id"))
      .single<Record<string, unknown>>();

    if (result.error !== null) {
      throw notFound(ERROR_CODES.WEBSITE_BOOKING_REQUEST_NOT_FOUND, result.error.message);
    }

    // Auto-assign display ID if missing
    await ensureDisplayIds(supabase, db, [result.data as unknown]);

    return c.json({ data: result.data });
  },
);

// Update website booking request (CRM note and status)
websiteBookingRequestRoutes.patch(
  "/api/website-booking-requests/:id",
  requirePermission("manageWebsiteBookingRequests"),
  async (c) => {
    const body: unknown = await c.req.json();
    const parsed = updateWebsiteBookingRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw badRequest(ERROR_CODES.VALIDATION_FAILED, "Invalid input", parsed.error.flatten().fieldErrors);
    }

    const updateFields: Record<string, unknown> = {};
    if (parsed.data.crm_note !== undefined) updateFields["crm_note"] = parsed.data.crm_note;
    if (parsed.data.status !== undefined) updateFields["status"] = parsed.data.status;

    if (Object.keys(updateFields).length === 0) {
      throw badRequest(ERROR_CODES.NO_FIELDS_TO_UPDATE, "No fields to update");
    }

    const supabase = c.get("supabase");
    const result = await supabase
      .from("bookings")
      .update(updateFields)
      .eq("id", c.req.param("id"))
      .select()
      .single<Record<string, unknown>>();

    if (result.error !== null) {
      throw internal(ERROR_CODES.SUPABASE_ERROR, result.error.message);
    }

    return c.json({ data: result.data });
  },
);

// Delete website booking request (admin only)
websiteBookingRequestRoutes.delete(
  "/api/website-booking-requests/:id",
  requirePermission("deleteWebsiteBookingRequests"),
  async (c) => {
    const supabase = c.get("supabase");
    const { error } = await supabase
      .from("bookings")
      .delete()
      .eq("id", c.req.param("id"));

    if (error !== null) {
      throw internal(ERROR_CODES.SUPABASE_ERROR, error.message);
    }

    return c.json({ success: true });
  },
);

export { websiteBookingRequestRoutes };
