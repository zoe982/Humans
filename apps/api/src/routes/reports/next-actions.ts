import { Hono } from "hono";
import { eq, and, inArray, isNull, sql } from "drizzle-orm";
import {
  entityNextActions,
  opportunities,
  opportunityHumans,
  humans,
  colleagues,
  generalLeads,
} from "@humans/db/schema";
import { ERROR_CODES } from "@humans/shared";
import { authMiddleware } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { supabaseMiddleware } from "../../middleware/supabase";
import { internal } from "../../lib/errors";
import { assertUniqueIds } from "../../lib/assert-unique-ids";
import type { AppContext } from "../../types";

const nextActionReportRoutes = new Hono<AppContext>();

nextActionReportRoutes.use("/*", authMiddleware);
nextActionReportRoutes.use("/*", supabaseMiddleware);

const VALID_ENA_ENTITY_TYPES = [
  "opportunity",
  "general_lead",
  "route_signup",
  "website_booking_request",
] as const;
type EnaEntityType = (typeof VALID_ENA_ENTITY_TYPES)[number];

function isValidEntityType(value: string): value is EnaEntityType {
  return (VALID_ENA_ENTITY_TYPES as readonly string[]).includes(value);
}

interface NextActionItem {
  id: string; // composite key for assertUniqueIds
  entityType: EnaEntityType;
  entityId: string;
  entityDisplayId: string;
  entityLabel: string;
  entityStatus: string;
  description: string;
  type: string | null;
  dueDate: string | null;
  isOverdue: boolean;
  ownerName: string | null;
  ownerId: string | null;
}

// GET /api/reports/next-actions
nextActionReportRoutes.get(
  "/api/reports/next-actions",
  requirePermission("viewRecords"),
  async (c) => {
    const db = c.get("db");
    const supabase = c.get("supabase");
    const rawColleagueId = c.req.query("colleagueId");
    const colleagueId = rawColleagueId !== undefined && rawColleagueId !== "" ? rawColleagueId : undefined;
    const todayIso = new Date().toISOString();

    // ── 1. Fetch entity_next_actions (not completed) ──────────────────────────
    const enaConditions = [isNull(entityNextActions.completedAt)];
    if (colleagueId != null) {
      enaConditions.push(eq(entityNextActions.ownerId, colleagueId));
    }

    // ── 2. Fetch opportunities with an active next action ────────────────────
    const oppConditions = [
      sql`${opportunities.nextActionDescription} IS NOT NULL`,
      isNull(opportunities.nextActionCompletedAt),
    ];
    if (colleagueId != null) {
      oppConditions.push(eq(opportunities.nextActionOwnerId, colleagueId));
    }

    const [enaRows, oppRows] = await Promise.all([
      db
        .select({
          id: entityNextActions.id,
          entityType: entityNextActions.entityType,
          entityId: entityNextActions.entityId,
          ownerId: entityNextActions.ownerId,
          description: entityNextActions.description,
          type: entityNextActions.type,
          dueDate: entityNextActions.dueDate,
        })
        .from(entityNextActions)
        .where(and(...enaConditions)),

      db
        .select({
          id: opportunities.id,
          displayId: opportunities.displayId,
          stage: opportunities.stage,
          nextActionOwnerId: opportunities.nextActionOwnerId,
          nextActionDescription: opportunities.nextActionDescription,
          nextActionType: opportunities.nextActionType,
          nextActionDueDate: opportunities.nextActionDueDate,
        })
        .from(opportunities)
        .where(and(...oppConditions)),
    ]);

    // ── 3. Resolve entity context for entity_next_actions ────────────────────
    const glIds = enaRows.filter((r) => r.entityType === "general_lead").map((r) => r.entityId);
    const rsIds = enaRows.filter((r) => r.entityType === "route_signup").map((r) => r.entityId);
    const brIds = enaRows.filter((r) => r.entityType === "website_booking_request").map((r) => r.entityId);

    // Resolve general leads from D1
    const glRows =
      glIds.length > 0
        ? await db
            .select({
              id: generalLeads.id,
              displayId: generalLeads.displayId,
              firstName: generalLeads.firstName,
              lastName: generalLeads.lastName,
              status: generalLeads.status,
            })
            .from(generalLeads)
            .where(inArray(generalLeads.id, glIds))
        : [];

    const glMap = new Map(glRows.map((g) => [g.id, g]));

    // Resolve route signups from Supabase
    interface SupabaseRouteSignup {
      id: string | number;
      display_id: string | null;
      first_name: string | null;
      last_name: string | null;
      status: string | null;
    }
    const rsMap = new Map<string, SupabaseRouteSignup>();
    if (rsIds.length > 0) {
      const rsResult = await supabase
        .from("announcement_signups")
        .select("id, display_id, first_name, last_name, status")
        .in("id", rsIds);
      if (rsResult.error != null) {
        throw internal(ERROR_CODES.SUPABASE_ERROR, rsResult.error.message);
      }
      for (const r of rsResult.data as SupabaseRouteSignup[]) {
        rsMap.set(String(r.id), r);
      }
    }

    // Resolve booking requests from Supabase
    interface SupabaseBooking {
      id: string | number;
      crm_display_id: string | null;
      first_name: string | null;
      last_name: string | null;
      status: string | null;
    }
    const brMap = new Map<string, SupabaseBooking>();
    if (brIds.length > 0) {
      const brResult = await supabase
        .from("bookings")
        .select("id, crm_display_id, first_name, last_name, status")
        .in("id", brIds);
      if (brResult.error != null) {
        throw internal(ERROR_CODES.SUPABASE_ERROR, brResult.error.message);
      }
      for (const b of brResult.data as SupabaseBooking[]) {
        brMap.set(String(b.id), b);
      }
    }

    // ── 4. Resolve opportunity primary human names ────────────────────────────
    const oppIds = oppRows.map((o) => o.id);
    const oppHumanMap = new Map<string, string>();
    if (oppIds.length > 0) {
      const oppHumanRows = await db
        .select({
          opportunityId: opportunityHumans.opportunityId,
          humanId: opportunityHumans.humanId,
        })
        .from(opportunityHumans)
        .where(inArray(opportunityHumans.opportunityId, oppIds));

      const humanIds = [...new Set(oppHumanRows.map((r) => r.humanId))];
      if (humanIds.length > 0) {
        const humanRows = await db
          .select({
            id: humans.id,
            firstName: humans.firstName,
            lastName: humans.lastName,
          })
          .from(humans)
          .where(inArray(humans.id, humanIds));

        const humanNameMap = new Map(humanRows.map((h) => [h.id, `${h.firstName} ${h.lastName}`]));

        // Map first human per opportunity
        for (const oh of oppHumanRows) {
          if (!oppHumanMap.has(oh.opportunityId)) {
            const name = humanNameMap.get(oh.humanId);
            if (name != null) {
              oppHumanMap.set(oh.opportunityId, name);
            }
          }
        }
      }
    }

    // ── 5. Resolve colleague names ────────────────────────────────────────────
    const allOwnerIds = [
      ...new Set([
        ...enaRows.map((r) => r.ownerId).filter((id): id is string => id != null),
        ...oppRows.map((r) => r.nextActionOwnerId).filter((id): id is string => id != null),
      ]),
    ];

    let colleagueMap = new Map<string, string>();
    if (allOwnerIds.length > 0) {
      const colleagueRows = await db
        .select({
          id: colleagues.id,
          name: colleagues.name,
        })
        .from(colleagues)
        .where(inArray(colleagues.id, allOwnerIds));
      colleagueMap = new Map(colleagueRows.map((col) => [col.id, col.name]));
    }

    // ── 6. Normalize into unified shape ──────────────────────────────────────
    const items: NextActionItem[] = [];

    for (const row of enaRows) {
      if (!isValidEntityType(row.entityType)) continue;

      let entityDisplayId = "";
      let entityLabel = "";
      let entityStatus = "";

      if (row.entityType === "general_lead") {
        const gl = glMap.get(row.entityId);
        entityDisplayId = gl?.displayId ?? row.entityId;
        entityLabel = gl != null ? `${gl.firstName} ${gl.lastName}` : row.entityId;
        entityStatus = gl?.status ?? "";
      } else if (row.entityType === "route_signup") {
        const rs = rsMap.get(row.entityId);
        entityDisplayId = rs?.display_id ?? row.entityId;
        entityLabel =
          rs != null && (rs.first_name != null || rs.last_name != null)
            ? `${rs.first_name ?? ""} ${rs.last_name ?? ""}`.trim()
            : row.entityId;
        entityStatus = rs?.status ?? "";
      } else if (row.entityType === "website_booking_request") {
        const br = brMap.get(row.entityId);
        entityDisplayId = br?.crm_display_id ?? row.entityId;
        entityLabel =
          br != null && (br.first_name != null || br.last_name != null)
            ? `${br.first_name ?? ""} ${br.last_name ?? ""}`.trim()
            : row.entityId;
        entityStatus = br?.status ?? "";
      }

      items.push({
        id: `${row.entityType}:${row.entityId}`,
        entityType: row.entityType,
        entityId: row.entityId,
        entityDisplayId,
        entityLabel,
        entityStatus,
        description: row.description ?? "",
        type: row.type,
        dueDate: row.dueDate,
        isOverdue: row.dueDate != null && row.dueDate < todayIso,
        ownerName: row.ownerId != null ? (colleagueMap.get(row.ownerId) ?? null) : null,
        ownerId: row.ownerId,
      });
    }

    for (const opp of oppRows) {
      items.push({
        id: `opportunity:${opp.id}`,
        entityType: "opportunity",
        entityId: opp.id,
        entityDisplayId: opp.displayId,
        entityLabel: oppHumanMap.get(opp.id) ?? opp.displayId,
        entityStatus: opp.stage,
        description: opp.nextActionDescription ?? "",
        type: opp.nextActionType,
        dueDate: opp.nextActionDueDate,
        isOverdue: opp.nextActionDueDate != null && opp.nextActionDueDate < todayIso,
        ownerName: opp.nextActionOwnerId != null ? (colleagueMap.get(opp.nextActionOwnerId) ?? null) : null,
        ownerId: opp.nextActionOwnerId,
      });
    }

    // ── 7. Sort: overdue first, then by dueDate ASC (nulls last) ─────────────
    items.sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
      if (a.dueDate == null && b.dueDate == null) return 0;
      if (a.dueDate == null) return 1;
      if (b.dueDate == null) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });

    // ── 8. Dedup via assertUniqueIds ──────────────────────────────────────────
    const deduped = assertUniqueIds(items, "next-actions-report", c);

    // Strip internal `id` field from response
    const data = deduped.map((item) => {
      const { id: _compositeId, ...rest } = item;
      void _compositeId;
      return rest;
    });

    return c.json({ data });
  },
);

export { nextActionReportRoutes };
