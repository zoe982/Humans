import { Hono } from "hono";
import type { SupabaseClient } from "@supabase/supabase-js";
import { inArray, eq } from "drizzle-orm";
import { leadScores, humanWebsiteBookingRequests } from "@humans/db/schema";
import { updateWebsiteBookingRequestSchema, updateEntityNextActionSchema, createEmailSchema, createPhoneNumberSchema, createSocialIdSchema, linkHumanSchema, ERROR_CODES } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { supabaseMiddleware } from "../middleware/supabase";
import { internal, notFound, badRequest } from "../lib/errors";
import { nextDisplayIdBatch } from "../lib/display-id";
import { getNextAction, updateNextAction, completeNextAction } from "../services/entity-next-actions";
import { getLinkedHumansForBookingRequest, linkWebsiteBookingRequest, unlinkWebsiteBookingRequest } from "../services/humans";
import { createEmail, deleteEmail, listEmailsForEntity } from "../services/emails";
import { createPhoneNumber, deletePhoneNumber, listPhoneNumbersForEntity } from "../services/phone-numbers";
import { createSocialId, deleteSocialId, listSocialIdsForEntity } from "../services/social-ids";
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
  const missing = rows.filter(
    (row): row is Record<string, unknown> =>
      isRecord(row) && row["crm_display_id"] == null,
  );
  if (missing.length === 0) return;

  const ids = await nextDisplayIdBatch(db, "BOR", missing.length);

  // Concurrency-limited Supabase updates (3 at a time)
  for (let i = 0; i < missing.length; i += 3) {
    const batch = missing.slice(i, i + 3);
    await Promise.all(
      batch.map(async (row, j) => {
        const displayId = ids[i + j];
        if (displayId === undefined) return;
        const { error } = await supabase
          .from("bookings")
          .update({ crm_display_id: displayId })
          .eq("id", row["id"]);
        if (error === null) {
          row["crm_display_id"] = displayId;
        }
      }),
    );
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
    const page = Math.max(1, Number.isFinite(rawPage) ? rawPage : 1);
    const limit = Math.min(10000, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 25));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from("bookings")
      .select("id, crm_display_id, first_name, middle_name, last_name, client_email, origin_city, destination_city, travel_date, status, deposit_status, inserted_at", { count: "exact" })
      .order("inserted_at", { ascending: false })
      .range(from, to);

    if (error !== null) {
      throw internal(ERROR_CODES.SUPABASE_ERROR, error.message);
    }

    // Auto-assign display IDs to rows missing them
    await ensureDisplayIds(supabase, db, data);

    // Fetch lead scores from D1
    const bookingIds = data.map((b) => String(b.id));
    let enriched: ({ id: string } & Record<string, unknown>)[] = data;
    if (bookingIds.length > 0) {
      const scores = await db
        .select({
          websiteBookingRequestId: leadScores.websiteBookingRequestId,
          scoreTotal: leadScores.scoreTotal,
        })
        .from(leadScores)
        .where(inArray(leadScores.websiteBookingRequestId, bookingIds));

      const scoreMap = new Map(scores.map((r) => [r.websiteBookingRequestId, r.scoreTotal]));
      enriched = data.map((b) => ({
        ...b,
        scoreTotal: scoreMap.get(String(b.id)) ?? null,
      }));
    }

    return c.json({ data: enriched, meta: { page, limit, total: count ?? 0 } });
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
    await ensureDisplayIds(supabase, db, [result.data]);

    // Fetch next action from D1
    const nextAction = await getNextAction(db, "website_booking_request", c.req.param("id"));

    return c.json({ data: { ...result.data, nextAction: nextAction ?? null } });
  },
);

// Get linked humans for a website booking request
websiteBookingRequestRoutes.get(
  "/api/website-booking-requests/:id/linked-humans",
  requirePermission("viewWebsiteBookingRequests"),
  async (c) => {
    const db = c.get("db");
    const data = await getLinkedHumansForBookingRequest(db, c.req.param("id"));
    return c.json({ data });
  },
);

// POST /api/website-booking-requests/:id/link-human
websiteBookingRequestRoutes.post(
  "/api/website-booking-requests/:id/link-human",
  requirePermission("manageWebsiteBookingRequests"),
  async (c) => {
    const body: unknown = await c.req.json();
    const data = linkHumanSchema.parse(body);
    await linkWebsiteBookingRequest(c.get("db"), data.humanId, c.req.param("id"));
    return c.json({ success: true });
  },
);

// DELETE /api/website-booking-requests/:id/link-human
websiteBookingRequestRoutes.delete(
  "/api/website-booking-requests/:id/link-human",
  requirePermission("manageWebsiteBookingRequests"),
  async (c) => {
    const db = c.get("db");
    const link = await db.select({ id: humanWebsiteBookingRequests.id }).from(humanWebsiteBookingRequests).where(eq(humanWebsiteBookingRequests.websiteBookingRequestId, c.req.param("id"))).limit(1);
    if (link[0] != null) {
      await unlinkWebsiteBookingRequest(db, link[0].id);
    }
    return c.json({ success: true });
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
    if (parsed.data.crm_source !== undefined) updateFields["crm_source"] = parsed.data.crm_source;
    if (parsed.data.crm_channel !== undefined) updateFields["crm_channel"] = parsed.data.crm_channel;

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

    // Clear next action when transitioning to a closed status
    if (typeof parsed.data.status === "string" && parsed.data.status.startsWith("closed_")) {
      const session = c.get("session");
      if (session !== null) {
        const db = c.get("db");
        await completeNextAction(db, "website_booking_request", c.req.param("id"), session.colleagueId);
      }
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

// Update next action
websiteBookingRequestRoutes.patch(
  "/api/website-booking-requests/:id/next-action",
  requirePermission("manageWebsiteBookingRequests"),
  async (c) => {
    const body: unknown = await c.req.json();
    const parsed = updateEntityNextActionSchema.safeParse(body);
    if (!parsed.success) {
      throw badRequest(ERROR_CODES.VALIDATION_FAILED, "Invalid input", parsed.error.flatten().fieldErrors);
    }

    const session = c.get("session");
    if (session === null) return c.json({ error: "Unauthorized" }, 401);

    const db = c.get("db");
    const nextAction = await updateNextAction(db, "website_booking_request", c.req.param("id"), parsed.data, session.colleagueId);
    return c.json({ data: nextAction });
  },
);

// Complete next action
websiteBookingRequestRoutes.post(
  "/api/website-booking-requests/:id/next-action/done",
  requirePermission("manageWebsiteBookingRequests"),
  async (c) => {
    const session = c.get("session");
    if (session === null) return c.json({ error: "Unauthorized" }, 401);

    const db = c.get("db");
    await completeNextAction(db, "website_booking_request", c.req.param("id"), session.colleagueId);
    return c.json({ success: true });
  },
);

// GET /api/website-booking-requests/:id/emails
websiteBookingRequestRoutes.get(
  "/api/website-booking-requests/:id/emails",
  requirePermission("viewWebsiteBookingRequests"),
  async (c) => {
    const data = await listEmailsForEntity(c.get("db"), "websiteBookingRequestId", c.req.param("id"));
    return c.json({ data });
  },
);

// GET /api/website-booking-requests/:id/phone-numbers
websiteBookingRequestRoutes.get(
  "/api/website-booking-requests/:id/phone-numbers",
  requirePermission("viewWebsiteBookingRequests"),
  async (c) => {
    const data = await listPhoneNumbersForEntity(c.get("db"), "websiteBookingRequestId", c.req.param("id"));
    return c.json({ data });
  },
);

// POST /api/website-booking-requests/:id/emails
websiteBookingRequestRoutes.post(
  "/api/website-booking-requests/:id/emails",
  requirePermission("manageWebsiteBookingRequests"),
  async (c) => {
    const body: unknown = await c.req.json();
    const data = createEmailSchema.parse(body);
    const result = await createEmail(c.get("db"), { ...data, websiteBookingRequestId: c.req.param("id") });
    return c.json({ data: result }, 201);
  },
);

// DELETE /api/website-booking-requests/:id/emails/:emailId
websiteBookingRequestRoutes.delete(
  "/api/website-booking-requests/:id/emails/:emailId",
  requirePermission("manageWebsiteBookingRequests"),
  async (c) => {
    await deleteEmail(c.get("db"), c.req.param("emailId"));
    return c.json({ success: true });
  },
);

// POST /api/website-booking-requests/:id/phone-numbers
websiteBookingRequestRoutes.post(
  "/api/website-booking-requests/:id/phone-numbers",
  requirePermission("manageWebsiteBookingRequests"),
  async (c) => {
    const body: unknown = await c.req.json();
    const data = createPhoneNumberSchema.parse(body);
    const result = await createPhoneNumber(c.get("db"), { ...data, websiteBookingRequestId: c.req.param("id") });
    return c.json({ data: result }, 201);
  },
);

// DELETE /api/website-booking-requests/:id/phone-numbers/:phoneId
websiteBookingRequestRoutes.delete(
  "/api/website-booking-requests/:id/phone-numbers/:phoneId",
  requirePermission("manageWebsiteBookingRequests"),
  async (c) => {
    await deletePhoneNumber(c.get("db"), c.req.param("phoneId"));
    return c.json({ success: true });
  },
);

// GET /api/website-booking-requests/:id/social-ids
websiteBookingRequestRoutes.get(
  "/api/website-booking-requests/:id/social-ids",
  requirePermission("viewWebsiteBookingRequests"),
  async (c) => {
    const data = await listSocialIdsForEntity(c.get("db"), "websiteBookingRequestId", c.req.param("id"));
    return c.json({ data });
  },
);

// POST /api/website-booking-requests/:id/social-ids
websiteBookingRequestRoutes.post(
  "/api/website-booking-requests/:id/social-ids",
  requirePermission("manageWebsiteBookingRequests"),
  async (c) => {
    const body: unknown = await c.req.json();
    const data = createSocialIdSchema.parse(body);
    const result = await createSocialId(c.get("db"), { ...data, websiteBookingRequestId: c.req.param("id") });
    return c.json({ data: result }, 201);
  },
);

// DELETE /api/website-booking-requests/:id/social-ids/:socialIdId
websiteBookingRequestRoutes.delete(
  "/api/website-booking-requests/:id/social-ids/:socialIdId",
  requirePermission("manageWebsiteBookingRequests"),
  async (c) => {
    await deleteSocialId(c.get("db"), c.req.param("socialIdId"));
    return c.json({ success: true });
  },
);

export { websiteBookingRequestRoutes };
