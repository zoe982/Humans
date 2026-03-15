import { Hono } from "hono";
import {
  createGeneralLeadSchema,
  updateGeneralLeadSchema,
  updateGeneralLeadStatusSchema,
  convertGeneralLeadSchema,
  linkHumanSchema,
  updateEntityNextActionSchema,
  createEmailSchema,
  createPhoneNumberSchema,
  createSocialIdSchema,
  importFromFrontSchema,
  ERROR_CODES,
} from "@humans/shared";
import { sql, and, inArray } from "drizzle-orm";
import { entityNextActions } from "@humans/db/schema";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { badRequest, internal, unauthorized } from "../lib/errors";
import {
  listGeneralLeads,
  getGeneralLead,
  createGeneralLead,
  updateGeneralLead,
  updateGeneralLeadStatus,
  convertGeneralLead,
  linkHumanToGeneralLead,
  unlinkHumanFromGeneralLead,
  deleteGeneralLead,
  importLeadFromFront,
} from "../services/general-leads";
import { createEmail, deleteEmail, listEmailsForEntity } from "../services/emails";
import { createPhoneNumber, deletePhoneNumber, listPhoneNumbersForEntity } from "../services/phone-numbers";
import { createSocialId, deleteSocialId, listSocialIdsForEntity } from "../services/social-ids";
import { getNextAction, updateNextAction, completeNextAction } from "../services/entity-next-actions";
import type { AppContext } from "../types";

const generalLeadRoutes = new Hono<AppContext>();

generalLeadRoutes.use("/*", authMiddleware);

// GET /api/general-leads
generalLeadRoutes.get("/api/general-leads", requirePermission("viewGeneralLeads"), async (c) => {
  const db = c.get("db");
  const rawPage = Number(c.req.query("page"));
  const rawLimit = Number(c.req.query("limit"));
  const page = Math.max(1, Number.isFinite(rawPage) ? rawPage : 1);
  const limit = Math.min(10000, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 25));
  const rawQ = c.req.query("q");
  const q = rawQ !== undefined && rawQ !== "" ? rawQ : undefined;
  const rawStatus = c.req.query("status");
  const status = rawStatus !== undefined && rawStatus !== "" ? rawStatus : undefined;
  const rawConvertedHumanId = c.req.query("convertedHumanId");
  const convertedHumanId = rawConvertedHumanId !== undefined && rawConvertedHumanId !== "" ? rawConvertedHumanId : undefined;
  const result = await listGeneralLeads(db, page, limit, { q, status, convertedHumanId });

  // Bulk-fetch next actions for all leads in the page
  const leadIds = result.data.map((l) => l.id);
  let nextActionMap = new Map<string, { type: string | null; description: string | null; dueDate: string | null }>();
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
          sql`${entityNextActions.entityType} = 'general_lead'`,
          inArray(entityNextActions.entityId, leadIds),
          sql`${entityNextActions.completedAt} IS NULL`,
        ),
      );
    nextActionMap = new Map(nextActions.map((na) => [na.entityId, { type: na.type, description: na.description, dueDate: na.dueDate }]));
  }

  const enriched = result.data.map((lead) => ({
    ...lead,
    nextAction: nextActionMap.get(lead.id) ?? null,
  }));

  return c.json({ data: enriched, meta: result.meta });
});

// POST /api/general-leads/import-from-front
generalLeadRoutes.post("/api/general-leads/import-from-front", requirePermission("manageGeneralLeads"), async (c) => {
  const body: unknown = await c.req.json();
  const parsed = importFromFrontSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequest(ERROR_CODES.VALIDATION_FAILED, "Invalid input", parsed.error.flatten().fieldErrors);
  }

  const session = c.get("session");
  if (session === null) throw unauthorized(ERROR_CODES.AUTH_REQUIRED, "Authentication required");

  const frontToken = c.env.FRONT_API_TOKEN;
  if (frontToken === "") {
    throw internal(ERROR_CODES.FRONT_SYNC_FAILED, "Front integration unavailable");
  }

  const result = await importLeadFromFront(c.get("db"), parsed.data.frontId, frontToken, session.colleagueId);
  return c.json({ data: result }, 201);
});

// GET /api/general-leads/:id
generalLeadRoutes.get("/api/general-leads/:id", requirePermission("viewGeneralLeads"), async (c) => {
  const db = c.get("db");
  const data = await getGeneralLead(db, c.req.param("id"));
  const nextAction = await getNextAction(db, "general_lead", c.req.param("id"));
  return c.json({ data: { ...data, nextAction: nextAction ?? null } });
});

// POST /api/general-leads
generalLeadRoutes.post("/api/general-leads", requirePermission("manageGeneralLeads"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createGeneralLeadSchema.parse(body);
  const session = c.get("session");
  if (session === null) throw unauthorized(ERROR_CODES.AUTH_REQUIRED, "Authentication required");
  const result = await createGeneralLead(c.get("db"), data, session.colleagueId);
  return c.json({ data: result }, 201);
});

// PATCH /api/general-leads/:id
generalLeadRoutes.patch("/api/general-leads/:id", requirePermission("manageGeneralLeads"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateGeneralLeadSchema.parse(body);
  const session = c.get("session");
  if (session === null) throw unauthorized(ERROR_CODES.AUTH_REQUIRED, "Authentication required");
  const result = await updateGeneralLead(c.get("db"), c.req.param("id"), data, session.colleagueId);
  return c.json(result);
});

// PATCH /api/general-leads/:id/status
generalLeadRoutes.patch("/api/general-leads/:id/status", requirePermission("manageGeneralLeads"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateGeneralLeadStatusSchema.parse(body);
  const session = c.get("session");
  if (session === null) throw unauthorized(ERROR_CODES.AUTH_REQUIRED, "Authentication required");
  const result = await updateGeneralLeadStatus(c.get("db"), c.req.param("id"), data, session.colleagueId);
  return c.json(result);
});

// POST /api/general-leads/:id/convert
generalLeadRoutes.post("/api/general-leads/:id/convert", requirePermission("manageGeneralLeads"), async (c) => {
  const body: unknown = await c.req.json();
  const data = convertGeneralLeadSchema.parse(body);
  const session = c.get("session");
  if (session === null) throw unauthorized(ERROR_CODES.AUTH_REQUIRED, "Authentication required");
  const result = await convertGeneralLead(c.get("db"), c.req.param("id"), data.humanId, session.colleagueId);
  return c.json(result);
});

// POST /api/general-leads/:id/link-human
generalLeadRoutes.post("/api/general-leads/:id/link-human", requirePermission("manageGeneralLeads"), async (c) => {
  const body: unknown = await c.req.json();
  const data = linkHumanSchema.parse(body);
  const session = c.get("session");
  if (session === null) throw unauthorized(ERROR_CODES.AUTH_REQUIRED, "Authentication required");
  await linkHumanToGeneralLead(c.get("db"), c.req.param("id"), data.humanId, session.colleagueId);
  return c.json({ success: true });
});

// DELETE /api/general-leads/:id/link-human
generalLeadRoutes.delete("/api/general-leads/:id/link-human", requirePermission("manageGeneralLeads"), async (c) => {
  const session = c.get("session");
  if (session === null) throw unauthorized(ERROR_CODES.AUTH_REQUIRED, "Authentication required");
  await unlinkHumanFromGeneralLead(c.get("db"), c.req.param("id"), session.colleagueId);
  return c.json({ success: true });
});

// DELETE /api/general-leads/:id
generalLeadRoutes.delete("/api/general-leads/:id", requirePermission("deleteGeneralLeads"), async (c) => {
  await deleteGeneralLead(c.get("db"), c.req.param("id"));
  return c.json({ success: true });
});

// PATCH /api/general-leads/:id/next-action
generalLeadRoutes.patch("/api/general-leads/:id/next-action", requirePermission("manageGeneralLeads"), async (c) => {
  const body: unknown = await c.req.json();
  const parsed = updateEntityNextActionSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequest(ERROR_CODES.VALIDATION_FAILED, "Invalid input", parsed.error.flatten().fieldErrors);
  }

  const session = c.get("session");
  if (session === null) throw unauthorized(ERROR_CODES.AUTH_REQUIRED, "Authentication required");

  const db = c.get("db");
  const nextAction = await updateNextAction(db, "general_lead", c.req.param("id"), parsed.data, session.colleagueId);
  return c.json({ data: nextAction });
});

// POST /api/general-leads/:id/next-action/done
generalLeadRoutes.post("/api/general-leads/:id/next-action/done", requirePermission("manageGeneralLeads"), async (c) => {
  const session = c.get("session");
  if (session === null) throw unauthorized(ERROR_CODES.AUTH_REQUIRED, "Authentication required");

  const db = c.get("db");
  await completeNextAction(db, "general_lead", c.req.param("id"), session.colleagueId);
  return c.json({ success: true });
});

// GET /api/general-leads/:id/emails
generalLeadRoutes.get("/api/general-leads/:id/emails", requirePermission("viewGeneralLeads"), async (c) => {
  const data = await listEmailsForEntity(c.get("db"), "generalLeadId", c.req.param("id"));
  return c.json({ data });
});

// GET /api/general-leads/:id/phone-numbers
generalLeadRoutes.get("/api/general-leads/:id/phone-numbers", requirePermission("viewGeneralLeads"), async (c) => {
  const data = await listPhoneNumbersForEntity(c.get("db"), "generalLeadId", c.req.param("id"));
  return c.json({ data });
});

// POST /api/general-leads/:id/emails
generalLeadRoutes.post("/api/general-leads/:id/emails", requirePermission("manageGeneralLeads"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createEmailSchema.parse(body);
  const result = await createEmail(c.get("db"), { ...data, generalLeadId: c.req.param("id") });
  return c.json({ data: result }, 201);
});

// DELETE /api/general-leads/:id/emails/:emailId
generalLeadRoutes.delete("/api/general-leads/:id/emails/:emailId", requirePermission("manageGeneralLeads"), async (c) => {
  await deleteEmail(c.get("db"), c.req.param("emailId"));
  return c.json({ success: true });
});

// POST /api/general-leads/:id/phone-numbers
generalLeadRoutes.post("/api/general-leads/:id/phone-numbers", requirePermission("manageGeneralLeads"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createPhoneNumberSchema.parse(body);
  const result = await createPhoneNumber(c.get("db"), { ...data, generalLeadId: c.req.param("id") });
  return c.json({ data: result }, 201);
});

// DELETE /api/general-leads/:id/phone-numbers/:phoneId
generalLeadRoutes.delete("/api/general-leads/:id/phone-numbers/:phoneId", requirePermission("manageGeneralLeads"), async (c) => {
  await deletePhoneNumber(c.get("db"), c.req.param("phoneId"));
  return c.json({ success: true });
});

// GET /api/general-leads/:id/social-ids
generalLeadRoutes.get("/api/general-leads/:id/social-ids", requirePermission("viewGeneralLeads"), async (c) => {
  const data = await listSocialIdsForEntity(c.get("db"), "generalLeadId", c.req.param("id"));
  return c.json({ data });
});

// POST /api/general-leads/:id/social-ids
generalLeadRoutes.post("/api/general-leads/:id/social-ids", requirePermission("manageGeneralLeads"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createSocialIdSchema.parse(body);
  const result = await createSocialId(c.get("db"), { ...data, generalLeadId: c.req.param("id") });
  return c.json({ data: result }, 201);
});

// DELETE /api/general-leads/:id/social-ids/:socialIdId
generalLeadRoutes.delete("/api/general-leads/:id/social-ids/:socialIdId", requirePermission("manageGeneralLeads"), async (c) => {
  await deleteSocialId(c.get("db"), c.req.param("socialIdId"));
  return c.json({ success: true });
});

export { generalLeadRoutes };
