import { Hono } from "hono";
import { eq, sql, and, inArray } from "drizzle-orm";
import { generalLeads, leadScores, entityNextActions } from "@humans/db/schema";
import { ERROR_CODES } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { supabaseMiddleware } from "../middleware/supabase";
import { internal } from "../lib/errors";
import { assertUniqueIds } from "../lib/assert-unique-ids";
import type { AppContext } from "../types";

const allLeadRoutes = new Hono<AppContext>();

allLeadRoutes.use("/*", authMiddleware);
allLeadRoutes.use("/*", supabaseMiddleware);

// GET /api/leads/all — unified view of all lead types
allLeadRoutes.get("/api/leads/all", requirePermission("viewGeneralLeads"), async (c) => {
  const db = c.get("db");
  const supabase = c.get("supabase");

  // Parallel fetch: D1 general leads + Supabase route signups + Supabase booking requests + Supabase evacuation leads
  const [generalLeadRows, routeSignupsResult, bookingRequestsResult, evacuationLeadsResult] = await Promise.all([
    db
      .select({
        id: generalLeads.id,
        displayId: generalLeads.displayId,
        status: generalLeads.status,
        firstName: generalLeads.firstName,
        middleName: generalLeads.middleName,
        lastName: generalLeads.lastName,
        source: generalLeads.source,
        channel: generalLeads.channel,
        createdAt: generalLeads.createdAt,
        scoreTotal: leadScores.scoreTotal,
      })
      .from(generalLeads)
      .leftJoin(leadScores, eq(leadScores.generalLeadId, generalLeads.id)),

    supabase
      .from("announcement_signups")
      .select("id, display_id, first_name, middle_name, last_name, status, crm_source, crm_channel, inserted_at"),

    supabase
      .from("bookings")
      .select("id, crm_display_id, first_name, middle_name, last_name, status, crm_source, crm_channel, inserted_at"),

    supabase
      .from("urgent_contact_requests")
      .select("id, display_id, first_name, middle_name, last_name, status, crm_source, crm_channel, inserted_at"),
  ]);

  if (routeSignupsResult.error !== null) {
    throw internal(ERROR_CODES.SUPABASE_ERROR, routeSignupsResult.error.message);
  }
  if (bookingRequestsResult.error !== null) {
    throw internal(ERROR_CODES.SUPABASE_ERROR, bookingRequestsResult.error.message);
  }
  if (evacuationLeadsResult.error !== null) {
    throw internal(ERROR_CODES.SUPABASE_ERROR, evacuationLeadsResult.error.message);
  }

  const routeSignups = routeSignupsResult.data;
  const bookingRequests = bookingRequestsResult.data;
  const evacuationLeads = evacuationLeadsResult.data;

  // Fetch lead scores from D1 for Supabase entities
  const routeSignupIds = routeSignups.map((s) => String(s.id));
  const bookingRequestIds = bookingRequests.map((b) => String(b.id));
  const evacuationLeadIds = evacuationLeads.map((e) => String(e.id));

  const [routeScores, bookingScores, evacuationScores] = await Promise.all([
    routeSignupIds.length > 0
      ? db
          .select({
            routeSignupId: leadScores.routeSignupId,
            scoreTotal: leadScores.scoreTotal,
          })
          .from(leadScores)
          .where(inArray(leadScores.routeSignupId, routeSignupIds))
      : Promise.resolve([]),
    bookingRequestIds.length > 0
      ? db
          .select({
            websiteBookingRequestId: leadScores.websiteBookingRequestId,
            scoreTotal: leadScores.scoreTotal,
          })
          .from(leadScores)
          .where(inArray(leadScores.websiteBookingRequestId, bookingRequestIds))
      : Promise.resolve([]),

    evacuationLeadIds.length > 0
      ? db
          .select({
            evacuationLeadId: leadScores.evacuationLeadId,
            scoreTotal: leadScores.scoreTotal,
          })
          .from(leadScores)
          .where(inArray(leadScores.evacuationLeadId, evacuationLeadIds))
      : Promise.resolve([]),
  ]);

  const routeScoreMap = new Map(routeScores.map((r) => [r.routeSignupId, r.scoreTotal]));
  const bookingScoreMap = new Map(bookingScores.map((r) => [r.websiteBookingRequestId, r.scoreTotal]));
  const evacuationScoreMap = new Map(evacuationScores.map((r) => [r.evacuationLeadId, r.scoreTotal]));

  // Normalize into unified shape
  interface UnifiedLead {
    id: string;
    displayId: string;
    leadType: "general_lead" | "route_signup" | "website_booking_request" | "evacuation_lead";
    status: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    channel: string | null;
    source: string | null;
    scoreTotal: number | null;
    nextAction: { type: string | null; description: string | null; dueDate: string | null } | null;
    createdAt: string;
  }

  const unified: UnifiedLead[] = [];

  for (const gl of generalLeadRows) {
    unified.push({
      id: `general_lead:${gl.id}`,
      displayId: gl.displayId,
      leadType: "general_lead",
      status: gl.status,
      firstName: gl.firstName,
      middleName: gl.middleName,
      lastName: gl.lastName,
      channel: gl.channel,
      source: gl.source,
      scoreTotal: gl.scoreTotal,
      nextAction: null,
      createdAt: gl.createdAt,
    });
  }

  for (const rs of routeSignups) {
    unified.push({
      id: `route_signup:${String(rs.id)}`,
      displayId: rs.display_id != null ? String(rs.display_id) : "",
      leadType: "route_signup",
      status: String(rs.status ?? "open"),
      firstName: String(rs.first_name ?? ""),
      middleName: rs.middle_name != null ? String(rs.middle_name) : null,
      lastName: String(rs.last_name ?? ""),
      channel: rs.crm_channel != null ? String(rs.crm_channel) : null,
      source: rs.crm_source != null ? String(rs.crm_source) : null,
      scoreTotal: routeScoreMap.get(String(rs.id)) ?? null,
      nextAction: null,
      createdAt: String(rs.inserted_at ?? ""),
    });
  }

  for (const br of bookingRequests) {
    unified.push({
      id: `website_booking_request:${String(br.id)}`,
      displayId: br.crm_display_id != null ? String(br.crm_display_id) : "",
      leadType: "website_booking_request",
      status: String(br.status ?? "open"),
      firstName: String(br.first_name ?? ""),
      middleName: br.middle_name != null ? String(br.middle_name) : null,
      lastName: String(br.last_name ?? ""),
      channel: br.crm_channel != null ? String(br.crm_channel) : null,
      source: br.crm_source != null ? String(br.crm_source) : null,
      scoreTotal: bookingScoreMap.get(String(br.id)) ?? null,
      nextAction: null,
      createdAt: String(br.inserted_at ?? ""),
    });
  }

  for (const el of evacuationLeads) {
    unified.push({
      id: `evacuation_lead:${String(el.id)}`,
      displayId: el.display_id != null ? String(el.display_id) : "",
      leadType: "evacuation_lead",
      status: String(el.status ?? "open"),
      firstName: String(el.first_name ?? ""),
      middleName: el.middle_name != null ? String(el.middle_name) : null,
      lastName: String(el.last_name ?? ""),
      channel: el.crm_channel != null ? String(el.crm_channel) : null,
      source: el.crm_source != null ? String(el.crm_source) : null,
      scoreTotal: evacuationScoreMap.get(String(el.id)) ?? null,
      nextAction: null,
      createdAt: String(el.inserted_at ?? ""),
    });
  }

  // Bulk fetch entity_next_actions for all three types (parallel)
  const glIds = generalLeadRows.map((gl) => gl.id);
  const rsIds = routeSignups.map((rs) => String(rs.id));
  const brIds = bookingRequests.map((br) => String(br.id));
  const elIds = evacuationLeads.map((el) => String(el.id));

  const nextActionSelect = {
    entityId: entityNextActions.entityId,
    type: entityNextActions.type,
    description: entityNextActions.description,
    dueDate: entityNextActions.dueDate,
  };

  const [glNextActions, rsNextActions, brNextActions, elNextActions] = await Promise.all([
    glIds.length > 0
      ? db
          .select(nextActionSelect)
          .from(entityNextActions)
          .where(
            and(
              eq(entityNextActions.entityType, "general_lead"),
              inArray(entityNextActions.entityId, glIds),
              sql`${entityNextActions.completedAt} IS NULL`,
            ),
          )
      : Promise.resolve([]),
    rsIds.length > 0
      ? db
          .select(nextActionSelect)
          .from(entityNextActions)
          .where(
            and(
              eq(entityNextActions.entityType, "route_signup"),
              inArray(entityNextActions.entityId, rsIds),
              sql`${entityNextActions.completedAt} IS NULL`,
            ),
          )
      : Promise.resolve([]),
    brIds.length > 0
      ? db
          .select(nextActionSelect)
          .from(entityNextActions)
          .where(
            and(
              eq(entityNextActions.entityType, "website_booking_request"),
              inArray(entityNextActions.entityId, brIds),
              sql`${entityNextActions.completedAt} IS NULL`,
            ),
          )
      : Promise.resolve([]),

    elIds.length > 0
      ? db
          .select(nextActionSelect)
          .from(entityNextActions)
          .where(
            and(
              eq(entityNextActions.entityType, "evacuation_lead"),
              inArray(entityNextActions.entityId, elIds),
              sql`${entityNextActions.completedAt} IS NULL`,
            ),
          )
      : Promise.resolve([]),
  ]);

  // Build next action lookup map (keyed by composite ID)
  const nextActionMap = new Map<string, { type: string | null; description: string | null; dueDate: string | null }>();
  for (const na of glNextActions) {
    nextActionMap.set(`general_lead:${na.entityId}`, { type: na.type, description: na.description, dueDate: na.dueDate });
  }
  for (const na of rsNextActions) {
    nextActionMap.set(`route_signup:${na.entityId}`, { type: na.type, description: na.description, dueDate: na.dueDate });
  }
  for (const na of brNextActions) {
    nextActionMap.set(`website_booking_request:${na.entityId}`, { type: na.type, description: na.description, dueDate: na.dueDate });
  }
  for (const na of elNextActions) {
    nextActionMap.set(`evacuation_lead:${na.entityId}`, { type: na.type, description: na.description, dueDate: na.dueDate });
  }

  // Merge next actions into unified leads
  for (const lead of unified) {
    const action = nextActionMap.get(lead.id);
    if (action != null) {
      lead.nextAction = action;
    }
  }

  // Sort by createdAt desc
  unified.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // Dedup via assertUniqueIds (composite IDs prevent cross-type collisions)
  const deduped = assertUniqueIds(unified, "all-leads", c);

  return c.json({ data: deduped });
});

export { allLeadRoutes };
