import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DataResponse {
  data: Record<string, unknown>[];
}

function isDataResponse(value: unknown): value is DataResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    Array.isArray((value as { data: unknown }).data)
  );
}

interface AttributionLookup {
  gclid: string | null;
  gclidTouch: "LT" | "FT" | null;
  fbclid: string | null;
  fbclidTouch: "LT" | "FT" | null;
  attributionId: string;
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

export const load = async ({
  locals,
  cookies,
}: RequestEvent): Promise<{
  rows: Record<string, unknown>[];
  user: NonNullable<typeof locals.user>;
}> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const headers = { Cookie: `humans_session=${sessionToken ?? ""}` };

  const [leadsRes, attribRes] = await Promise.all([
    fetch(`${PUBLIC_API_URL}/api/leads/all`, { headers }),
    fetch(`${PUBLIC_API_URL}/api/marketing-attributions`, { headers }),
  ]);

  // Parse leads — if API fails, return empty
  if (!leadsRes.ok) return { rows: [], user: locals.user };
  const leadsRaw: unknown = await leadsRes.json();
  if (!isDataResponse(leadsRaw)) return { rows: [], user: locals.user };

  // Parse attributions — graceful degradation (empty map on failure)
  let attribMap = new Map<string, AttributionLookup>();
  if (attribRes.ok) {
    const attribRaw: unknown = await attribRes.json();
    if (isDataResponse(attribRaw)) {
      attribMap = buildAttributionMap(attribRaw.data);
    }
  }

  // Enrich each lead with attribution data
  const rows: Record<string, unknown>[] = [];
  for (const lead of leadsRaw.data) {
    const idStr = typeof lead["id"] === "string" ? lead["id"] : "";
    const rawId = idStr.split(":")[1] ?? "";
    const attrib = attribMap.get(rawId);
    rows.push({
      ...lead,
      gclid: attrib?.gclid ?? null,
      gclidTouch: attrib?.gclidTouch ?? null,
      fbclid: attrib?.fbclid ?? null,
      fbclidTouch: attrib?.fbclidTouch ?? null,
      attributionId: attrib?.attributionId ?? null,
    });
  }

  return { rows, user: locals.user };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function buildAttributionMap(attributions: unknown[]): Map<string, AttributionLookup> {
  const map = new Map<string, AttributionLookup>();

  for (const a of attributions) {
    if (typeof a !== "object" || a === null) continue;

    const linkedLead = (a as { linkedLead?: unknown }).linkedLead;
    if (typeof linkedLead !== "object" || linkedLead === null) continue;
    const leadId = (linkedLead as { leadId?: unknown }).leadId;
    if (typeof leadId !== "string") continue;

    const rec = a as { ltGclid?: unknown; ftGclid?: unknown; ltFbclid?: unknown; ftFbclid?: unknown; id?: unknown };
    const ltGclid = toStringOrNull(rec.ltGclid);
    const ftGclid = toStringOrNull(rec.ftGclid);
    const ltFbclid = toStringOrNull(rec.ltFbclid);
    const ftFbclid = toStringOrNull(rec.ftFbclid);

    map.set(leadId, {
      gclid: ltGclid ?? ftGclid ?? null,
      gclidTouch: ltGclid != null ? "LT" : ftGclid != null ? "FT" : null,
      fbclid: ltFbclid ?? ftFbclid ?? null,
      fbclidTouch: ltFbclid != null ? "LT" : ftFbclid != null ? "FT" : null,
      attributionId: String(rec.id),
    });
  }

  return map;
}
