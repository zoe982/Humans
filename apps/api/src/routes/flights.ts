import { Hono } from "hono";
import type { SupabaseClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { ERROR_CODES } from "@humans/shared";
import { opportunities, opportunityHumans, humans, opportunityHumanRolesConfig } from "@humans/db/schema";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { supabaseMiddleware } from "../middleware/supabase";
import { internal, notFound } from "../lib/errors";
import { nextDisplayId } from "../lib/display-id";
import type { AppContext } from "../types";
import type { DB } from "../services/types";

const flightRoutes = new Hono<AppContext>();

flightRoutes.use("/*", authMiddleware);
flightRoutes.use("/*", supabaseMiddleware);

/**
 * Auto-assign crm_display_id to flights that don't have one yet.
 * Writes back to Supabase and mutates the row objects in place.
 */
async function ensureFlightDisplayIds(
  supabase: SupabaseClient,
  db: DB,
  rows: Record<string, unknown>[],
): Promise<void> {
  for (const row of rows) {
    if (row["crm_display_id"] == null) {
      const displayId = await nextDisplayId(db, "FLY");
      const { error } = await supabase
        .from("flights")
        .update({ crm_display_id: displayId })
        .eq("id", row["id"]);
      if (!error) {
        row["crm_display_id"] = displayId;
      }
    }
  }
}

// List all flights (paginated)
flightRoutes.get(
  "/api/flights",
  requirePermission("viewFlights"),
  async (c) => {
    const supabase = c.get("supabase");
    const db = c.get("db");
    const page = Math.max(1, Number(c.req.query("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(c.req.query("limit")) || 25));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from("flights")
      .select("*", { count: "exact" })
      .order("flight_date", { ascending: false })
      .range(from, to);

    if (error) {
      throw internal(ERROR_CODES.SUPABASE_ERROR, error.message);
    }

    if (data) {
      await ensureFlightDisplayIds(supabase, db, data as Record<string, unknown>[]);
    }

    return c.json({ data, meta: { page, limit, total: count ?? 0 } });
  },
);

// Summary list for dropdowns (lightweight)
flightRoutes.get(
  "/api/flights/summary",
  requirePermission("viewFlights"),
  async (c) => {
    const supabase = c.get("supabase");
    const db = c.get("db");

    const { data, error } = await supabase
      .from("flights")
      .select("id, crm_display_id, origin_city, destination_city, flight_date")
      .order("flight_date", { ascending: false })
      .limit(200);

    if (error) {
      throw internal(ERROR_CODES.SUPABASE_ERROR, error.message);
    }

    if (data) {
      await ensureFlightDisplayIds(supabase, db, data as Record<string, unknown>[]);
    }

    return c.json({ data });
  },
);

// Get single flight + linked opportunities from D1
flightRoutes.get(
  "/api/flights/:id",
  requirePermission("viewFlights"),
  async (c) => {
    const supabase = c.get("supabase");
    const db = c.get("db");
    const flightId = c.req.param("id");

    const { data, error } = await supabase
      .from("flights")
      .select("*")
      .eq("id", flightId)
      .single();

    if (error) {
      throw notFound(ERROR_CODES.FLIGHT_NOT_FOUND, error.message);
    }

    if (data) {
      await ensureFlightDisplayIds(supabase, db, [data as Record<string, unknown>]);
    }

    // Fetch linked opportunities from D1
    const linkedOpps = await db
      .select({
        id: opportunities.id,
        displayId: opportunities.displayId,
        stage: opportunities.stage,
        passengerSeats: opportunities.passengerSeats,
        petSeats: opportunities.petSeats,
      })
      .from(opportunities)
      .where(eq(opportunities.flightId, flightId));

    // Fetch primary humans for each opportunity
    const oppIds = linkedOpps.map((o) => o.id);
    let primaryHumans: Record<string, { firstName: string; lastName: string; displayId: string }> = {};

    if (oppIds.length > 0) {
      const roleConfigs = await db.select().from(opportunityHumanRolesConfig);
      const primaryRoleId = roleConfigs.find((r) => r.name === "primary")?.id;

      if (primaryRoleId) {
        const links = await db
          .select({
            opportunityId: opportunityHumans.opportunityId,
            firstName: humans.firstName,
            lastName: humans.lastName,
            displayId: humans.displayId,
          })
          .from(opportunityHumans)
          .innerJoin(humans, eq(opportunityHumans.humanId, humans.id))
          .where(eq(opportunityHumans.roleId, primaryRoleId));

        for (const link of links) {
          if (oppIds.includes(link.opportunityId)) {
            primaryHumans[link.opportunityId] = {
              firstName: link.firstName,
              lastName: link.lastName,
              displayId: link.displayId,
            };
          }
        }
      }
    }

    const linkedOpportunities = linkedOpps.map((opp) => ({
      ...opp,
      primaryHuman: primaryHumans[opp.id] ?? null,
    }));

    return c.json({ data, linkedOpportunities });
  },
);

export { flightRoutes };
