import { Hono } from "hono";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sql, and, inArray, eq } from "drizzle-orm";
import { activities, leadScores, humanEvacuationLeads, entityNextActions } from "@humans/db/schema";
import { updateEvacuationLeadSchema, updateEntityNextActionSchema, createEmailSchema, createPhoneNumberSchema, createSocialIdSchema, linkHumanSchema, ERROR_CODES } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { supabaseMiddleware } from "../middleware/supabase";
import { internal, notFound, badRequest } from "../lib/errors";
import { sanitizePostgrestValue } from "../lib/supabase-sanitize";
import { nextDisplayIdBatch } from "../lib/display-id";
import { getNextAction, updateNextAction, completeNextAction } from "../services/entity-next-actions";
import { linkEvacuationLead, unlinkEvacuationLead, getLinkedHumanForEvacuationLead } from "../services/humans";
import { createEmail, deleteEmail, listEmailsForEntity } from "../services/emails";
import { createPhoneNumber, deletePhoneNumber, listPhoneNumbersForEntity } from "../services/phone-numbers";
import { createSocialId, deleteSocialId, listSocialIdsForEntity } from "../services/social-ids";
import type { AppContext } from "../types";
import type { DB } from "../services/types";

const evacuationLeadRoutes = new Hono<AppContext>();

evacuationLeadRoutes.use("/*", authMiddleware);
evacuationLeadRoutes.use("/*", supabaseMiddleware);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Auto-assign crm_display_id to evacuation leads that don't have one yet.
 * Writes back to Supabase and mutates the row objects in place.
 */
async function ensureDisplayIds(
  supabase: SupabaseClient,
  db: DB,
  rows: unknown[],
): Promise<void> {
  const missing = rows.filter(
    (row): row is Record<string, unknown> =>
      isRecord(row) && row["display_id"] == null,
  );
  if (missing.length === 0) return;

  const ids = await nextDisplayIdBatch(db, "EVA", missing.length);

  // Concurrency-limited Supabase updates (3 at a time)
  for (let i = 0; i < missing.length; i += 3) {
    const batch = missing.slice(i, i + 3);
    await Promise.all(
      batch.map(async (row, j) => {
        const displayId = ids[i + j];
        if (displayId === undefined) return;
        const { error } = await supabase
          .from("urgent_contact_requests")
          .update({ display_id: displayId })
          .eq("id", row["id"]);
        if (error === null) {
          row["display_id"] = displayId;
        }
      }),
    );
  }
}

// List all evacuation leads (paginated, filterable)
evacuationLeadRoutes.get("/api/evacuation-leads", requirePermission("viewEvacuationLeads"), async (c) => {
  const supabase = c.get("supabase");
  const rawPage = Number(c.req.query("page"));
  const rawLimit = Number(c.req.query("limit"));
  const page = Math.max(1, Number.isFinite(rawPage) ? rawPage : 1);
  const limit = Math.min(10000, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 25));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const status = c.req.query("status") ?? "";
  const q = c.req.query("q") ?? "";
  const dateFrom = c.req.query("dateFrom") ?? "";
  const dateTo = c.req.query("dateTo") ?? "";

  let query = supabase
    .from("urgent_contact_requests")
    .select("id, display_id, first_name, middle_name, last_name, email, phone, interests, consent_contact, consent_newsletter, status, note, inserted_at, crm_channel, crm_source, loss_reason, loss_notes", { count: "exact" });

  if (status !== "") query = query.eq("status", status);
  if (dateFrom !== "") query = query.gte("inserted_at", dateFrom);
  if (dateTo !== "") query = query.lte("inserted_at", `${dateTo}T23:59:59.999Z`);
  if (q !== "") {
    const safeQ = sanitizePostgrestValue(q);
    query = query.or(
      `first_name.ilike.%${safeQ}%,last_name.ilike.%${safeQ}%,email.ilike.%${safeQ}%,phone.ilike.%${safeQ}%`
    );
  }

  const { data, error, count } = await query
    .order("inserted_at", { ascending: false })
    .range(from, to);

  if (error !== null) {
    throw internal(ERROR_CODES.SUPABASE_ERROR, error.message);
  }

  const db = c.get("db");

  // Auto-assign display IDs to rows missing them
  await ensureDisplayIds(supabase, db, data);

  // Fetch last activity dates from D1
  const leadIds = data.map((s) => String(s.id));
  let enriched: ({ id: string } & Record<string, unknown>)[] = data;
  if (leadIds.length > 0) {
    const lastDates = await db
      .select({
        evacuationLeadId: activities.evacuationLeadId,
        lastActivityDate: sql<string>`max(${activities.activityDate})`,
      })
      .from(activities)
      .where(inArray(activities.evacuationLeadId, leadIds))
      .groupBy(activities.evacuationLeadId);

    const dateMap = new Map(lastDates.map((r) => [r.evacuationLeadId, r.lastActivityDate]));
    enriched = data.map((s) => ({
      ...s,
      lastActivityDate: dateMap.get(String(s.id)) ?? null,
    }));
  }

  // Fetch lead scores from D1
  const enrichedIds = enriched.map((s) => s.id);
  if (enrichedIds.length > 0) {
    const scores = await db
      .select({
        evacuationLeadId: leadScores.evacuationLeadId,
        scoreTotal: leadScores.scoreTotal,
      })
      .from(leadScores)
      .where(inArray(leadScores.evacuationLeadId, enrichedIds));

    const scoreMap = new Map(scores.map((r) => [r.evacuationLeadId, r.scoreTotal]));
    enriched = enriched.map((s) => ({
      ...s,
      scoreTotal: scoreMap.get(s.id) ?? null,
    }));
  }

  // Bulk-fetch next actions
  if (leadIds.length > 0) {
    const nextActions = await db
      .select({
        entityId: entityNextActions.entityId,
        type: entityNextActions.type,
        description: entityNextActions.description,
        dueDate: entityNextActions.dueDate,
      })
      .from(entityNextActions)
      .where(
        and(
          sql`${entityNextActions.entityType} = 'evacuation_lead'`,
          inArray(entityNextActions.entityId, leadIds),
          sql`${entityNextActions.completedAt} IS NULL`,
        ),
      );
    const nextActionMap = new Map(nextActions.map((na) => [na.entityId, { type: na.type, description: na.description, dueDate: na.dueDate }]));
    enriched = enriched.map((s) => ({
      ...s,
      nextAction: nextActionMap.get(s.id) ?? null,
    }));
  }

  return c.json({ data: enriched, meta: { page, limit, total: count ?? 0 } });
});

// Get single evacuation lead
evacuationLeadRoutes.get("/api/evacuation-leads/:id", requirePermission("viewEvacuationLeads"), async (c) => {
  const supabase = c.get("supabase");
  const db = c.get("db");
  const result = await supabase
    .from("urgent_contact_requests")
    .select("*")
    .eq("id", c.req.param("id"))
    .single<Record<string, unknown>>();

  if (result.error !== null) {
    throw notFound(ERROR_CODES.EVACUATION_LEAD_NOT_FOUND, result.error.message);
  }

  // Auto-assign display ID if missing
  await ensureDisplayIds(supabase, db, [result.data]);

  // Fetch next action from D1
  const nextAction = await getNextAction(db, "evacuation_lead", c.req.param("id"));

  return c.json({ data: { ...result.data, nextAction: nextAction ?? null } });
});

// Update evacuation lead (status and/or note)
evacuationLeadRoutes.patch("/api/evacuation-leads/:id", requirePermission("manageEvacuationLeads"), async (c) => {
  const body: unknown = await c.req.json();
  const parsed = updateEvacuationLeadSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequest(ERROR_CODES.VALIDATION_FAILED, "Invalid input", parsed.error.flatten().fieldErrors);
  }

  const updateFields: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) updateFields["status"] = parsed.data.status;
  if (parsed.data.note !== undefined) updateFields["note"] = parsed.data.note;
  if (parsed.data.crm_source !== undefined) updateFields["crm_source"] = parsed.data.crm_source;
  if (parsed.data.crm_channel !== undefined) updateFields["crm_channel"] = parsed.data.crm_channel;
  if (parsed.data.loss_reason !== undefined) updateFields["loss_reason"] = parsed.data.loss_reason;
  if (parsed.data.loss_notes !== undefined) updateFields["loss_notes"] = parsed.data.loss_notes;

  if (Object.keys(updateFields).length === 0) {
    throw badRequest(ERROR_CODES.NO_FIELDS_TO_UPDATE, "No fields to update");
  }

  const supabase = c.get("supabase");
  const result = await supabase
    .from("urgent_contact_requests")
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
      await completeNextAction(db, "evacuation_lead", c.req.param("id"), session.colleagueId);
    }
  }

  return c.json({ data: result.data });
});

// Delete evacuation lead (admin only)
evacuationLeadRoutes.delete("/api/evacuation-leads/:id", requirePermission("deleteEvacuationLeads"), async (c) => {
  const supabase = c.get("supabase");
  const { error } = await supabase
    .from("urgent_contact_requests")
    .delete()
    .eq("id", c.req.param("id"));

  if (error !== null) {
    throw internal(ERROR_CODES.SUPABASE_ERROR, error.message);
  }

  return c.json({ success: true });
});

// Update next action
evacuationLeadRoutes.patch("/api/evacuation-leads/:id/next-action", requirePermission("manageEvacuationLeads"), async (c) => {
  const body: unknown = await c.req.json();
  const parsed = updateEntityNextActionSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequest(ERROR_CODES.VALIDATION_FAILED, "Invalid input", parsed.error.flatten().fieldErrors);
  }

  const session = c.get("session");
  if (session === null) return c.json({ error: "Unauthorized" }, 401);

  const db = c.get("db");
  const nextAction = await updateNextAction(db, "evacuation_lead", c.req.param("id"), parsed.data, session.colleagueId);
  return c.json({ data: nextAction });
});

// Complete next action
evacuationLeadRoutes.post("/api/evacuation-leads/:id/next-action/done", requirePermission("manageEvacuationLeads"), async (c) => {
  const session = c.get("session");
  if (session === null) return c.json({ error: "Unauthorized" }, 401);

  const db = c.get("db");
  await completeNextAction(db, "evacuation_lead", c.req.param("id"), session.colleagueId);
  return c.json({ success: true });
});

// GET /api/evacuation-leads/:id/emails
evacuationLeadRoutes.get("/api/evacuation-leads/:id/emails", requirePermission("viewEvacuationLeads"), async (c) => {
  const data = await listEmailsForEntity(c.get("db"), "evacuationLeadId", c.req.param("id"));
  return c.json({ data });
});

// GET /api/evacuation-leads/:id/phone-numbers
evacuationLeadRoutes.get("/api/evacuation-leads/:id/phone-numbers", requirePermission("viewEvacuationLeads"), async (c) => {
  const data = await listPhoneNumbersForEntity(c.get("db"), "evacuationLeadId", c.req.param("id"));
  return c.json({ data });
});

// POST /api/evacuation-leads/:id/emails
evacuationLeadRoutes.post("/api/evacuation-leads/:id/emails", requirePermission("manageEvacuationLeads"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createEmailSchema.parse(body);
  const result = await createEmail(c.get("db"), { ...data, evacuationLeadId: c.req.param("id") });
  return c.json({ data: result }, 201);
});

// DELETE /api/evacuation-leads/:id/emails/:emailId
evacuationLeadRoutes.delete("/api/evacuation-leads/:id/emails/:emailId", requirePermission("manageEvacuationLeads"), async (c) => {
  await deleteEmail(c.get("db"), c.req.param("emailId"));
  return c.json({ success: true });
});

// POST /api/evacuation-leads/:id/phone-numbers
evacuationLeadRoutes.post("/api/evacuation-leads/:id/phone-numbers", requirePermission("manageEvacuationLeads"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createPhoneNumberSchema.parse(body);
  const result = await createPhoneNumber(c.get("db"), { ...data, evacuationLeadId: c.req.param("id") });
  return c.json({ data: result }, 201);
});

// DELETE /api/evacuation-leads/:id/phone-numbers/:phoneId
evacuationLeadRoutes.delete("/api/evacuation-leads/:id/phone-numbers/:phoneId", requirePermission("manageEvacuationLeads"), async (c) => {
  await deletePhoneNumber(c.get("db"), c.req.param("phoneId"));
  return c.json({ success: true });
});

// GET /api/evacuation-leads/:id/linked-human
evacuationLeadRoutes.get("/api/evacuation-leads/:id/linked-human", requirePermission("viewEvacuationLeads"), async (c) => {
  const db = c.get("db");
  const data = await getLinkedHumanForEvacuationLead(db, c.req.param("id"));
  return c.json({ data });
});

// POST /api/evacuation-leads/:id/link-human
evacuationLeadRoutes.post("/api/evacuation-leads/:id/link-human", requirePermission("manageEvacuationLeads"), async (c) => {
  const body: unknown = await c.req.json();
  const data = linkHumanSchema.parse(body);
  await linkEvacuationLead(c.get("db"), data.humanId, c.req.param("id"));
  return c.json({ success: true });
});

// DELETE /api/evacuation-leads/:id/link-human
evacuationLeadRoutes.delete("/api/evacuation-leads/:id/link-human", requirePermission("manageEvacuationLeads"), async (c) => {
  const db = c.get("db");
  const link = await db.select({ id: humanEvacuationLeads.id }).from(humanEvacuationLeads).where(eq(humanEvacuationLeads.evacuationLeadId, c.req.param("id"))).limit(1);
  if (link[0] != null) {
    await unlinkEvacuationLead(db, link[0].id);
  }
  return c.json({ success: true });
});

// GET /api/evacuation-leads/:id/social-ids
evacuationLeadRoutes.get("/api/evacuation-leads/:id/social-ids", requirePermission("viewEvacuationLeads"), async (c) => {
  const data = await listSocialIdsForEntity(c.get("db"), "evacuationLeadId", c.req.param("id"));
  return c.json({ data });
});

// POST /api/evacuation-leads/:id/social-ids
evacuationLeadRoutes.post("/api/evacuation-leads/:id/social-ids", requirePermission("manageEvacuationLeads"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createSocialIdSchema.parse(body);
  const result = await createSocialId(c.get("db"), { ...data, evacuationLeadId: c.req.param("id") });
  return c.json({ data: result }, 201);
});

// DELETE /api/evacuation-leads/:id/social-ids/:socialIdId
evacuationLeadRoutes.delete("/api/evacuation-leads/:id/social-ids/:socialIdId", requirePermission("manageEvacuationLeads"), async (c) => {
  await deleteSocialId(c.get("db"), c.req.param("socialIdId"));
  return c.json({ success: true });
});

export { evacuationLeadRoutes };
